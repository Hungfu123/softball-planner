package com.softball.domain.service;

import com.softball.domain.model.GameStaff;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.StaffRole;

import java.util.Comparator;
import java.util.List;

/**
 * Sagt, wer an den Bases coacht — und wer es zu Beginn tun wuerde, wenn der Trainer
 * niemanden benannt hat.
 *
 * <p>Sind mehr Leute da als Schlagplaetze, benennt der Trainer Base Coaches von der Bank
 * und das steht als {@link GameStaff} fest: benannte Coaches gewinnen immer. Sind es genau
 * so viele, coachen die beiden, die zuletzt aus waren; zu Beginn, wenn noch keiner aus war,
 * sind das die untersten Schlagplaetze. Die App rechnet im Spiel ausdruecklich <b>nichts</b>
 * mit — sie nennt nur dieses Startpaar, je nicht benannter Base einen Platz von unten.
 *
 * <p>Geliefert werden <b>Namen</b>, nicht Nummern: wer "#9 #10" liest, muss erst abzaehlen,
 * und liest es leicht als "die untersten beiden coachen immer". Ein Name beantwortet sofort,
 * ob man selbst gemeint ist.
 */
public final class BaseCoachRegel {

    private BaseCoachRegel() {}

    /** Namen der benannten Coaches (oder {@code null}) und die Namen derer, die zu Beginn fuer die unbenannten Bases uebernehmen. */
    public record BaseCoachAuskunft(String ersteBase, String dritteBase, List<String> startCoaches) {}

    public static BaseCoachAuskunft fuer(final List<LineupEntry> lineup, final List<GameStaff> staff) {
        final String ersteBase = coach(staff, StaffRole.BASE_COACH_1ST);
        final String dritteBase = coach(staff, StaffRole.BASE_COACH_3RD);
        final int unbenannt = (ersteBase == null ? 1 : 0) + (dritteBase == null ? 1 : 0);

        final List<String> starter = lineup.stream()
            .sorted(Comparator.comparingInt(LineupEntry::getBattingOrder).reversed())
            .limit(unbenannt)
            .sorted(Comparator.comparingInt(LineupEntry::getBattingOrder))
            .map(e -> e.getPlayer().getName())
            .toList();
        return new BaseCoachAuskunft(ersteBase, dritteBase, starter);
    }

    private static String coach(final List<GameStaff> staff, final StaffRole rolle) {
        return staff.stream()
            .filter(s -> s.getRole() == rolle)
            .map(s -> s.getPlayer().getName())
            .findFirst()
            .orElse(null);
    }
}
