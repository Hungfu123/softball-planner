package com.softball.shared.config;

import com.softball.domain.model.AuditKind;

import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.softball.domain.model.AuditKind.LOGIN;
import static com.softball.domain.model.AuditKind.SCORING;
import static com.softball.domain.model.AuditKind.WRITE;

/**
 * Die eine Stelle, die Methode und Pfad in deutschen Klartext uebersetzt. Ein neuer Endpunkt
 * braucht hier eine Zeile; fehlt sie, erscheint er in der Historie trotzdem, nur als Methode
 * plus Pfad (der Eintrag hat dann kein Label), nie unsichtbar.
 * <p>
 * Die erste Gruppe im Muster ist die Id des Ziels. {@code SCORING} sind die Pfade, die das
 * Live-Scoring ausloest; sie werden beim Lesen zu Spannen zusammengefasst.
 */
public final class AuditLabels {

    public record Eintrag(AuditKind kind, String label, String targetType, Long targetId) {
    }

    private record Regel(String method, Pattern pfad, AuditKind kind, String label, String targetType) {
    }

    private static final Eintrag UNBEKANNT = new Eintrag(WRITE, null, null, null);

    /** Reine Pruefung ohne Wirkung, bei jeder Aufstellungsaenderung mehrfach aufgerufen: nur Rauschen. */
    private static final Pattern OHNE_EINTRAG = Pattern.compile("/api/games/\\d+/lineup/check");

    private static final Set<String> SCHREIB_METHODEN = Set.of("POST", "PUT", "PATCH", "DELETE");

    private static final List<Regel> REGELN = List.of(
        // Anmeldung und eigenes Konto
        r("POST", "/api/auth/login", LOGIN, "Angemeldet", null),
        r("PUT", "/api/me/username", WRITE, "Eigenen Benutzernamen geändert", null),
        r("PUT", "/api/me/password", WRITE, "Eigenes Passwort geändert", null),
        // Accounts
        r("POST", "/api/users", WRITE, "Account angelegt", null),
        r("POST", "/api/users/bulk-create", WRITE, "Accounts für alle Spieler angelegt", null),
        r("PUT", "/api/users/(\\d+)/password-reset", WRITE, "Passwort zurückgesetzt", "USER"),
        r("PUT", "/api/users/(\\d+)/role", WRITE, "Rolle geändert", "USER"),
        r("PUT", "/api/users/(\\d+)/may-score", WRITE, "Scorer-Recht geändert", "USER"),
        r("PUT", "/api/users/(\\d+)/locked", WRITE, "Sperre geändert", "USER"),
        r("DELETE", "/api/users/(\\d+)", WRITE, "Account gelöscht", "USER"),
        // Spieler
        r("POST", "/api/players", WRITE, "Spieler angelegt", null),
        r("PUT", "/api/players/(\\d+)", WRITE, "Spieler geändert", "PLAYER"),
        r("PUT", "/api/players/(\\d+)/gender", WRITE, "Geschlecht geändert", "PLAYER"),
        r("PUT", "/api/players/(\\d+)/positions", WRITE, "Positionsprofil geändert", "PLAYER"),
        r("PUT", "/api/players/(\\d+)/archive", WRITE, "Spieler archiviert", "PLAYER"),
        r("PUT", "/api/players/(\\d+)/unarchive", WRITE, "Spieler reaktiviert", "PLAYER"),
        r("DELETE", "/api/players/(\\d+)", WRITE, "Spieler gelöscht", "PLAYER"),
        r("PUT", "/api/players/(\\d+)/whatsapp-name", WRITE, "WhatsApp-Name geändert", "PLAYER"),
        r("PUT", "/api/players/batting-order", WRITE, "Schlagreihenfolge der Spieler geändert", null),
        // Saisons, Spieltage
        r("POST", "/api/seasons", WRITE, "Saison angelegt", null),
        r("POST", "/api/seasons/copy-year", WRITE, "Jahr kopiert", null),
        r("PUT", "/api/seasons/(\\d+)", WRITE, "Saison geändert", "SEASON"),
        r("DELETE", "/api/seasons/(\\d+)", WRITE, "Saison gelöscht", "SEASON"),
        r("POST", "/api/seasons/(\\d+)/gamedays", WRITE, "Spieltag angelegt", "SEASON"),
        r("PUT", "/api/gamedays/(\\d+)", WRITE, "Spieltag geändert", "GAMEDAY"),
        r("PUT", "/api/gamedays/(\\d+)/players", WRITE, "Verfügbare Spieler geändert", "GAMEDAY"),
        r("POST", "/api/gamedays/(\\d+)/lineup/suggest-all", WRITE, "Auto-Aufstellung erzeugt", "GAMEDAY"),
        r("POST", "/api/gamedays/(\\d+)/lineup/undo", WRITE, "Auto-Aufstellung zurückgenommen", "GAMEDAY"),
        r("DELETE", "/api/gamedays/(\\d+)", WRITE, "Spieltag gelöscht", "GAMEDAY"),
        r("POST", "/api/gamedays/(\\d+)/poll-votes/fetch", WRITE, "Umfrage-Stimmen abgerufen", "GAMEDAY"),
        r("POST", "/api/gamedays/(\\d+)/poll-votes/apply", WRITE, "Umfrage-Stimmen übernommen", "GAMEDAY"),
        r("POST", "/api/gamedays/(\\d+)/lineup-sets", WRITE, "Lineup-Set gespeichert", "GAMEDAY"),
        r("PUT", "/api/lineup-sets/(\\d+)", WRITE, "Lineup-Set geändert", "LINEUP_SET"),
        r("PATCH", "/api/lineup-sets/(\\d+)", WRITE, "Lineup-Set umbenannt", "LINEUP_SET"),
        r("DELETE", "/api/lineup-sets/(\\d+)", WRITE, "Lineup-Set gelöscht", "LINEUP_SET"),
        // Spiele: Aufstellung und Stab
        r("PUT", "/api/games/(\\d+)/lineup", WRITE, "Lineup geändert", "GAME"),
        r("PUT", "/api/games/(\\d+)/staff", WRITE, "Base-Coaches geändert", "GAME"),
        r("PUT", "/api/games/(\\d+)/opponent", WRITE, "Gegner geändert", "GAME"),
        r("POST", "/api/games/(\\d+)/swap/\\d+", WRITE, "Spiele getauscht", "GAME"),
        // Spiele: Scoring (Spielstand, Seitenwechsel, Ende, Wechsel, At-Bats, Stealing, Uhr)
        r("PUT", "/api/games/(\\d+)/score", SCORING, "Spielstand gesetzt", "GAME"),
        r("POST", "/api/games/(\\d+)/end", SCORING, "Spiel beendet", "GAME"),
        r("PUT", "/api/games/(\\d+)/batting-side", SCORING, "Schlagseite gewechselt", "GAME"),
        r("POST", "/api/games/(\\d+)/reopen", SCORING, "Spiel wieder geöffnet", "GAME"),
        r("PUT", "/api/games/(\\d+)/substitutions", SCORING, "Wechsel geändert", "GAME"),
        r("POST", "/api/games/(\\d+)/substitutions", SCORING, "Spielerwechsel eingetragen", "GAME"),
        r("POST", "/api/games/(\\d+)/atbats", SCORING, "At-Bat eingetragen", "GAME"),
        r("DELETE", "/api/games/(\\d+)/atbats/last", SCORING, "At-Bat zurückgenommen", "GAME"),
        r("PUT", "/api/games/(\\d+)/atbats/last/base-state", SCORING, "Base-Stand korrigiert", "GAME"),
        r("DELETE", "/api/games/(\\d+)/scoring", SCORING, "Scoring zurückgesetzt", "GAME"),
        r("DELETE", "/api/games/(\\d+)/scoring/current-inning", SCORING, "Inning gelöscht", "GAME"),
        r("POST", "/api/games/(\\d+)/scoring/undo", SCORING, "Aktion zurückgenommen", "GAME"),
        r("POST", "/api/games/(\\d+)/scoring/next-inning", SCORING, "Inning weitergeschaltet", "GAME"),
        r("POST", "/api/games/(\\d+)/scoring/automatic-out", SCORING, "Automatisches Aus eingetragen", "GAME"),
        r("POST", "/api/games/(\\d+)/stealing-events", SCORING, "Stehlen eingetragen", "GAME"),
        r("DELETE", "/api/games/(\\d+)/stealing-events/\\d+", SCORING, "Stehlen gelöscht", "GAME"),
        r("POST", "/api/games/(\\d+)/clock/(?:start|pause|resume|reset)", SCORING, "Spieluhr bedient", "GAME"),
        // Spielbogen (RFL)
        r("POST", "/api/spielbogen", WRITE, "Spielbogen angelegt", null),
        r("PATCH", "/api/spielbogen/(\\d+)", WRITE, "Spielbogen: Kopfdaten geändert", "SPIELBOGEN"),
        r("DELETE", "/api/spielbogen/(\\d+)", WRITE, "Spielbogen gelöscht", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/register-league-result", WRITE, "Spielbogen: Liga-Ergebnis eingetragen", "SPIELBOGEN"),
        r("PUT", "/api/spielbogen/(\\d+)/lineup", WRITE, "Spielbogen: Aufstellung geändert", "SPIELBOGEN"),
        r("PATCH", "/api/spielbogen/(\\d+)/slots/\\d+", WRITE, "Spielbogen: Slot geändert", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/lineup/copy-from-gameday", WRITE, "Spielbogen: Aufstellung übernommen", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/(?:start|end|reopen)", SCORING, "Spielbogen: Spielstatus geändert", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/at-bats", SCORING, "Spielbogen: At-Bat eingetragen", "SPIELBOGEN"),
        r("DELETE", "/api/spielbogen/(\\d+)/at-bats/last", SCORING, "Spielbogen: At-Bat zurückgenommen", "SPIELBOGEN"),
        r("PATCH", "/api/spielbogen/(\\d+)/at-bats/last", SCORING, "Spielbogen: At-Bat korrigiert", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/stealing-events", SCORING, "Spielbogen: Stehlen eingetragen", "SPIELBOGEN"),
        r("DELETE", "/api/spielbogen/(\\d+)/stealing-events/\\d+", SCORING, "Spielbogen: Stehlen gelöscht", "SPIELBOGEN"),
        r("DELETE", "/api/spielbogen/(\\d+)/stealing/last", SCORING, "Spielbogen: Stehlen zurückgenommen", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/substitutions", SCORING, "Spielbogen: Wechsel eingetragen", "SPIELBOGEN"),
        r("DELETE", "/api/spielbogen/(\\d+)/substitutions/\\d+", SCORING, "Spielbogen: Wechsel gelöscht", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/position-swaps", SCORING, "Spielbogen: Positionstausch eingetragen", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/(?:switch-side|set-side)", SCORING, "Spielbogen: Seitenwechsel", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/reset", SCORING, "Spielbogen: zurückgesetzt", "SPIELBOGEN"),
        r("POST", "/api/spielbogen/(\\d+)/clock/(?:start|pause|resume|reset)", SCORING, "Spielbogen: Spieluhr bedient", "SPIELBOGEN"),
        // Liga
        r("POST", "/api/seasons/(\\d+)/results", WRITE, "Liga-Ergebnis eingetragen", "SEASON"),
        r("PUT", "/api/results/(\\d+)", WRITE, "Liga-Ergebnis geändert", "LEAGUE_RESULT"),
        r("DELETE", "/api/results/(\\d+)", WRITE, "Liga-Ergebnis gelöscht", "LEAGUE_RESULT"),
        r("POST", "/api/seasons/(\\d+)/teams", WRITE, "Team angelegt", "SEASON"),
        r("PUT", "/api/teams/(\\d+)", WRITE, "Team geändert", "TEAM"),
        r("DELETE", "/api/teams/(\\d+)", WRITE, "Team gelöscht", "TEAM"),
        r("PUT", "/api/teams/directory/rename", WRITE, "Team im Verzeichnis umbenannt", null),
        // Training
        r("POST", "/api/trainings", WRITE, "Training angelegt", null),
        r("POST", "/api/trainings/bulk", WRITE, "Trainings angelegt", null),
        r("PUT", "/api/trainings/(\\d+)", WRITE, "Training geändert", "TRAINING"),
        r("DELETE", "/api/trainings/(\\d+)", WRITE, "Training gelöscht", "TRAINING"),
        r("PUT", "/api/trainings/(\\d+)/attendance", WRITE, "Anwesenheit geändert", "TRAINING"),
        r("POST", "/api/trainings/periods", WRITE, "Trainingsperiode angelegt", null),
        r("PUT", "/api/trainings/periods/(\\d+)", WRITE, "Trainingsperiode geändert", "TRAINING_PERIOD"),
        r("DELETE", "/api/trainings/periods/(\\d+)", WRITE, "Trainingsperiode gelöscht", "TRAINING_PERIOD"),
        r("POST", "/api/training-plans/generate", WRITE, "Trainingsplan erzeugt", null),
        r("PUT", "/api/training-plans/(\\d+)", WRITE, "Trainingsplan geändert", "TRAINING_PLAN"),
        r("PATCH", "/api/training-plans/(\\d+)/sections/\\d+", WRITE, "Trainingsplan-Abschnitt geändert", "TRAINING_PLAN"),
        r("POST", "/api/training-plans/(\\d+)/beginner-group", WRITE, "Anfängergruppe geändert", "TRAINING_PLAN"),
        r("DELETE", "/api/training-plans/(\\d+)", WRITE, "Trainingsplan gelöscht", "TRAINING_PLAN"),
        r("PUT", "/api/coach-billing/profile", WRITE, "Abrechnungsprofil geändert", null),
        // Playmaker
        r("POST", "/api/plays", WRITE, "Play angelegt", null),
        r("PUT", "/api/plays/(\\d+)", WRITE, "Play geändert", "PLAY"),
        r("POST", "/api/plays/(\\d+)/duplicate", WRITE, "Play dupliziert", "PLAY"),
        r("DELETE", "/api/plays/(\\d+)", WRITE, "Play gelöscht", "PLAY"),
        r("POST", "/api/play-categories", WRITE, "Play-Kategorie angelegt", null),
        r("PUT", "/api/play-categories/(\\d+)", WRITE, "Play-Kategorie geändert", "PLAY_CATEGORY"),
        r("POST", "/api/play-categories/(\\d+)/merge/\\d+", WRITE, "Play-Kategorien zusammengeführt", "PLAY_CATEGORY"),
        r("DELETE", "/api/play-categories/(\\d+)", WRITE, "Play-Kategorie gelöscht", "PLAY_CATEGORY"),
        // Einladungen
        r("POST", "/api/invitations", WRITE, "Einladung angelegt", null),
        r("PUT", "/api/invitations/(\\d+)", WRITE, "Einladung geändert", "INVITATION"),
        r("POST", "/api/invitations/(\\d+)/duplicate", WRITE, "Einladung dupliziert", "INVITATION"),
        r("DELETE", "/api/invitations/(\\d+)", WRITE, "Einladung gelöscht", "INVITATION"),
        // WhatsApp
        r("POST", "/api/orga/whatsapp/polls", WRITE, "WhatsApp-Umfrage angelegt", null),
        r("PUT", "/api/orga/whatsapp/polls/(\\d+)", WRITE, "WhatsApp-Umfrage geändert", "WHATSAPP_POLL"),
        r("DELETE", "/api/orga/whatsapp/polls/(\\d+)", WRITE, "WhatsApp-Umfrage gelöscht", "WHATSAPP_POLL"),
        r("POST", "/api/orga/whatsapp/polls/(\\d+)/send-now", WRITE, "WhatsApp-Umfrage gesendet", "WHATSAPP_POLL"),
        r("POST", "/api/orga/whatsapp/polls/(\\d+)/reset-sent", WRITE, "WhatsApp-Umfrage zurückgesetzt", "WHATSAPP_POLL"),
        r("POST", "/api/orga/whatsapp/polls/(\\d+)/skip-dates", WRITE, "WhatsApp-Termin ausgesetzt", "WHATSAPP_POLL"),
        r("DELETE", "/api/orga/whatsapp/polls/(\\d+)/skip-dates/[^/]+", WRITE, "WhatsApp-Aussetzer entfernt", "WHATSAPP_POLL"),
        r("POST", "/api/orga/whatsapp/sync", WRITE, "WhatsApp-Stimmen abgeglichen", null),
        r("POST", "/api/orga/whatsapp/assign", WRITE, "WhatsApp-Name zugeordnet", null),
        r("POST", "/api/orga/whatsapp/assign-new", WRITE, "WhatsApp-Name als neuer Spieler zugeordnet", null),
        r("POST", "/api/orga/whatsapp/unassign", WRITE, "WhatsApp-Zuordnung gelöst", null)
);

    private AuditLabels() {
    }

    private static Regel r(final String method, final String pfad, final AuditKind kind, final String label,
                           final String targetType) {
        return new Regel(method, Pattern.compile(pfad), kind, label, targetType);
    }

    public static boolean schreibend(final String method) {
        return SCHREIB_METHODEN.contains(method);
    }

    /** Gehoert der Aufruf nicht in die Historie, obwohl er schreibend aussieht? */
    public static boolean ohneEintrag(final String method, final String path) {
        return "POST".equals(method) && OHNE_EINTRAG.matcher(path).matches();
    }

    public static Eintrag zuordnen(final String method, final String path) {
        for (final Regel regel : REGELN) {
            if (regel.method().equals(method)) {
                final Matcher m = regel.pfad().matcher(path);
                if (m.matches()) {
                    final Long id = regel.targetType() != null ? Long.valueOf(m.group(1)) : null;
                    return new Eintrag(regel.kind(), regel.label(), regel.targetType(), id);
                }
            }
        }
        return UNBEKANNT;
    }
}
