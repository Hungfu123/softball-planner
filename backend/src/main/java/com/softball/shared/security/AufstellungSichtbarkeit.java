package com.softball.shared.security;

import com.softball.domain.model.GameDay;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.function.Predicate;

/**
 * Die Lesegrenze der Aufstellung an EINER Stelle: darf der Angemeldete sehen, wer an diesem
 * Spieltag spielt? Vier Zweige, jeder einzeln wichtig.
 *
 * <ul>
 *   <li><b>Trainer</b> (ADMIN/SUPERADMIN) sehen immer — sie stellen sie ja auf.</li>
 *   <li><b>Scorer</b> sehen immer. Wer scoren darf, oeffnet den Spielbogen eines Spiels, das
 *       noch nicht freigegeben ist; ohne diesen Zweig waere der Bogen leer, und zwar genau
 *       dann, wenn das Spiel losgeht. Geprueft wird mit {@link ScoringPermission} — dieselbe
 *       Regel, die auch das Schreiben traegt, keine zweite daneben.</li>
 *   <li><b>Freigegeben</b> ({@code lineupsReleasedAt != null}) heisst: sie steht, jeder darf
 *       sie lesen.</li>
 *   <li><b>Vergangen</b> ({@code date < heute}) heisst: ein gespieltes Spiel ist Geschichte,
 *       keine Planung. „Noch nicht sehen" heisst BEVOR sie steht, nicht NIE WIEDER — der
 *       Spiele-Log laedt fuer jedes vergangene Spiel die Schlagreihenfolge, und niemand gibt
 *       hundert alte Spieltage nachtraeglich frei.</li>
 * </ul>
 *
 * <p>Wer nicht sehen darf, bekommt eine LEERE Antwort, keinen Fehler — darueber entscheiden
 * die Endpunkte, nicht diese Klasse.
 *
 * <p>Kein {@code @RequestScope}: die Klasse haelt keinen Zustand. Sie liest aber
 * {@link CurrentUser} und den SecurityContext und funktioniert deshalb nur innerhalb einer
 * HTTP-Anfrage.
 *
 * <p>Die beiden Methoden, die einen Spieltag nachschlagen, tragen
 * {@code @Transactional(readOnly = true)}: die Endpunkte fragen VOR ihrer eigenen Transaktion,
 * und ein Spieltag traegt seine Saison als Lazy-Proxy — ohne Sitzung faellt schon das Lesen
 * des Datums um. Fuer Trainer und Scorer wird gar nicht erst gelesen, und {@link #filter()}
 * schlaegt nichts nach und braucht deshalb keine.
 */
@Component
public class AufstellungSichtbarkeit {

    private final ScoringPermission scoring;
    private final GameDayRepository gameDayRepository;
    private final GameRepository gameRepository;

    public AufstellungSichtbarkeit(final ScoringPermission scoring,
                                   final GameDayRepository gameDayRepository,
                                   final GameRepository gameRepository) {
        this.scoring = scoring;
        this.gameDayRepository = gameDayRepository;
        this.gameRepository = gameRepository;
    }

    /** Darf der Angemeldete die Aufstellungen dieses Spieltags sehen? */
    @Transactional(readOnly = true)
    public boolean darfSehen(final Long gameDayId) {
        if (sieht()) {
            return true;
        }
        if (gameDayId == null) {
            return false;
        }
        return gameDayRepository.findById(gameDayId).map(AufstellungSichtbarkeit::istOffen).orElse(false);
    }

    /** Dasselbe, nur von einem Spiel aus gefragt — es haengt am Spieltag. */
    @Transactional(readOnly = true)
    public boolean darfSehenFuerSpiel(final Long gameId) {
        if (sieht()) {
            return true;
        }
        if (gameId == null) {
            return false;
        }
        return gameRepository.findGameDayIdByGameId(gameId).map(this::darfSehen).orElse(false);
    }

    /**
     * Dieselbe Regel als Filter ueber Spieltage, die der Aufrufer ohnehin schon geladen hat.
     * Die Rolle wird EINMAL gefragt, alles Weitere steht am Spieltag selbst — gedacht fuer
     * Auswertungen, die eine ganze Saison durchzaehlen, wo eine Abfrage je Spieltag ein
     * N+1 waere.
     */
    public Predicate<GameDay> filter() {
        if (sieht()) {
            return gameDay -> true;
        }
        return AufstellungSichtbarkeit::istOffen;
    }

    /** Die beiden Zweige, die ohne Spieltag auskommen — und die Datenbank gar nicht erst fragen. */
    private boolean sieht() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return istTrainer(auth) || scoring.darfSchreiben(auth);
    }

    private static boolean istOffen(final GameDay gameDay) {
        if (gameDay.getLineupsReleasedAt() != null) {
            return true;
        }
        return gameDay.getDate() != null && gameDay.getDate().isBefore(LocalDate.now());
    }

    /**
     * Rollen aus dem SecurityContext, nicht aus der Datenbank: ein Trainer-Konto braucht fuer
     * diese Frage keinen Datenbank-Treffer. Die Rollenhierarchie wird hier nicht aufgeloest,
     * deshalb stehen beide Rollen ausdruecklich da.
     */
    private static boolean istTrainer(final Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> ("ROLE_" + Role.ADMIN).equals(a) || ("ROLE_" + Role.SUPERADMIN).equals(a));
    }
}
