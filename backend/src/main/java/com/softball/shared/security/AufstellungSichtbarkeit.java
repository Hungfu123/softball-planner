package com.softball.shared.security;

import com.softball.domain.model.AufstellungsLage;
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

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.function.Predicate;

/**
 * Die Lesegrenze der Aufstellung an EINER Stelle: darf der Angemeldete sehen, wer an diesem
 * Spieltag spielt? Der Trainer baut sie tagelang um, dabei soll keiner zusehen; steht sie,
 * gibt er sie frei. Vergisst er das, steht sie am Spieltag trotzdem da.
 *
 * <p>Die {@link AufstellungsLage} eines Spieltags (unabhaengig vom Betrachter), in dieser
 * Reihenfolge geprueft:
 * <ol>
 *   <li>{@code date < heute} -> {@code OFFEN_VERGANGEN}: ein gespieltes Spiel ist
 *       Geschichte, keine Planung. „Noch nicht sehen" heisst BEVOR sie steht, nicht NIE WIEDER
 *       — der Spiele-Log laedt fuer jedes vergangene Spiel die Schlagreihenfolge. Diese
 *       Pruefung steht VOR der Freigabe, damit ein vergangener, freigegebener Spieltag nicht
 *       als {@code FREIGEGEBEN} gilt (siehe {@link AufstellungsLage}).</li>
 *   <li>{@code lineupsReleasedAt != null} -> {@code FREIGEGEBEN}: sie steht, jeder darf lesen.</li>
 *   <li>heute und ab 07:00 Berliner Zeit -> {@code OFFEN_AB_SIEBEN}: der Rueckfall, wenn
 *       die Freigabe vergessen wurde. Ab morgens, nicht ab Mitternacht, denn um Mitternacht
 *       baut der Trainer unter Umstaenden noch um. Das ist KEINE automatische Freigabe:
 *       {@code lineupsReleasedAt} bleibt leer.</li>
 *   <li>heute vor 07:00 -> {@code HEUTE_VOR_SIEBEN}</li>
 *   <li>sonst -> {@code GESPERRT}</li>
 * </ol>
 *
 * <p>Wer sieht: <b>Trainer</b> (ADMIN/SUPERADMIN) immer — sie stellen sie ja auf, und
 * dafuer wird die Datenbank nicht gefragt. Alle anderen sehen {@code FREIGEGEBEN},
 * {@code OFFEN_VERGANGEN} und {@code OFFEN_AB_SIEBEN}. <b>Scorer</b> sehen zusaetzlich
 * {@code HEUTE_VOR_SIEBEN}: wer scoren darf, oeffnet den Spielbogen am Spieltag, und der
 * waere sonst leer, wenn das Spiel losgeht. Am Spieltag, nicht immer: ein Scorer ist kein
 * eigener Rang, {@code may_score} haengt an einem Konto mit der Rolle PLAYER und er bekommt
 * dieselbe Seite wie alle anderen — ein „sieht immer" liesse ihn am Mittwoch lesen, was
 * alle anderen noch nicht lesen. Verloren geht ihm damit nichts: freigegeben wird meist am
 * Vortag. Geprueft wird mit {@link ScoringPermission} — dieselbe Regel, die auch das
 * Schreiben traegt, keine zweite daneben.
 *
 * <p>Wer nicht sehen darf, bekommt eine LEERE Antwort, keinen Fehler — darueber entscheiden
 * die Endpunkte, nicht diese Klasse.
 *
 * <p>Die Berliner Zeit entsteht HIER, durch die ausdrueckliche Umrechnung des Zeitpunkts der
 * {@link Clock}; die Zone des Containers spielt keine Rolle und wird nirgends umgestellt
 * (viele Spalten sind {@code TIMESTAMP} ohne Zone, jede historische Zeit wuerde sich verschieben).
 *
 * <p>Kein {@code @RequestScope}: die Klasse haelt keinen Zustand. Sie liest aber
 * {@link CurrentUser} und den SecurityContext und funktioniert deshalb nur innerhalb einer
 * HTTP-Anfrage.
 *
 * <p>Die beiden Methoden, die einen Spieltag nachschlagen, tragen
 * {@code @Transactional(readOnly = true)}: die Endpunkte fragen VOR ihrer eigenen Transaktion,
 * und ein Spieltag traegt seine Saison als Lazy-Proxy — ohne Sitzung faellt schon das Lesen
 * des Datums um. Fuer Trainer wird gar nicht erst gelesen, und {@link #filter()} schlaegt
 * nichts nach (auch nicht fuer Scorer) und braucht deshalb keine.
 */
@Component
public class AufstellungSichtbarkeit {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final LocalTime SCHWELLE = LocalTime.of(7, 0);

    private final ScoringPermission scoring;
    private final GameDayRepository gameDayRepository;
    private final GameRepository gameRepository;
    private final Clock clock;

    public AufstellungSichtbarkeit(final ScoringPermission scoring,
                                   final GameDayRepository gameDayRepository,
                                   final GameRepository gameRepository,
                                   final Clock clock) {
        this.scoring = scoring;
        this.gameDayRepository = gameDayRepository;
        this.gameRepository = gameRepository;
        this.clock = clock;
    }

    /** Wo dieser Spieltag steht — fuer jeden Betrachter gleich, siehe Klassendoku. */
    public AufstellungsLage lage(final GameDay gameDay) {
        final ZonedDateTime jetzt = clock.instant().atZone(BERLIN);
        final LocalDate heute = jetzt.toLocalDate();
        final LocalDate datum = gameDay.getDate();
        if (datum != null && datum.isBefore(heute)) {
            return AufstellungsLage.OFFEN_VERGANGEN;
        }
        if (gameDay.getLineupsReleasedAt() != null) {
            return AufstellungsLage.FREIGEGEBEN;
        }
        if (datum != null && datum.equals(heute)) {
            return jetzt.toLocalTime().isBefore(SCHWELLE)
                    ? AufstellungsLage.HEUTE_VOR_SIEBEN
                    : AufstellungsLage.OFFEN_AB_SIEBEN;
        }
        return AufstellungsLage.GESPERRT;
    }

    /** Darf der Angemeldete die Aufstellungen dieses Spieltags sehen? */
    @Transactional(readOnly = true)
    public boolean darfSehen(final Long gameDayId) {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (istTrainer(auth)) {
            return true;
        }
        if (gameDayId == null) {
            return false;
        }
        final boolean scorer = scoring.darfSchreiben(auth);
        return gameDayRepository.findById(gameDayId).map(gameDay -> darfSehen(gameDay, scorer)).orElse(false);
    }

    /** Dasselbe, nur von einem Spiel aus gefragt — es haengt am Spieltag. */
    @Transactional(readOnly = true)
    public boolean darfSehenFuerSpiel(final Long gameId) {
        if (istTrainer(SecurityContextHolder.getContext().getAuthentication())) {
            return true;
        }
        if (gameId == null) {
            return false;
        }
        return gameRepository.findGameDayIdByGameId(gameId).map(this::darfSehen).orElse(false);
    }

    /**
     * Dieselbe Regel als Filter ueber Spieltage, die der Aufrufer ohnehin schon geladen hat.
     * Rolle und Scorer-Recht werden EINMAL gefragt, alles Weitere steht am Spieltag selbst —
     * gedacht fuer Auswertungen, die eine ganze Saison durchzaehlen, wo eine Abfrage je
     * Spieltag ein N+1 waere.
     */
    public Predicate<GameDay> filter() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (istTrainer(auth)) {
            return gameDay -> true;
        }
        final boolean scorer = scoring.darfSchreiben(auth);
        return gameDay -> darfSehen(gameDay, scorer);
    }

    private boolean darfSehen(final GameDay gameDay, final boolean scorer) {
        return switch (lage(gameDay)) {
            case FREIGEGEBEN, OFFEN_VERGANGEN, OFFEN_AB_SIEBEN -> true;
            case HEUTE_VOR_SIEBEN -> scorer;
            case GESPERRT -> false;
        };
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
