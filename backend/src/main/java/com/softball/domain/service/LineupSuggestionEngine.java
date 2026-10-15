package com.softball.domain.service;

import com.softball.domain.model.*;

import java.util.*;
import java.util.stream.Collectors;

public class LineupSuggestionEngine {

    static final List<Position> AUTO_POSITIONS = List.of(
        Position.P, Position.C,
        Position.FIRST_BASE, Position.SECOND_BASE, Position.THIRD_BASE,
        Position.SS, Position.LF, Position.CF, Position.RF
    );

    private static final Set<String> MANUAL_POSITIONS = Set.of("EH");

    /** Rang fuer "dieser Posten steht nicht im Profil" — schlechter als jeder Slot. */
    private static final int NO_PROFILE = 4;

    public List<SuggestionResult> suggest(final List<LineupEntry> currentEntries,
                                           final Map<Long, Player> playerMap,
                                           final Set<Long> staffIds,
                                           final Map<Long, Integer> gamesPlayedCount,
                                           final Map<Long, Double> participationByPlayer,
                                           final Random random) {

        // Separate manual entries (P, C, EH only) from auto-position and unassigned entries
        final List<LineupEntry> manualEntries = new ArrayList<>();
        final Set<Long> manualPlayerIds = new HashSet<>();

        for (final LineupEntry entry : currentEntries) {
            final String posName = entry.getPosition() != null ? entry.getPosition().displayName() : null;
            if (posName != null && MANUAL_POSITIONS.contains(posName)) {
                manualEntries.add(entry);
                manualPlayerIds.add(entry.getPlayer().getId());
                if (entry.getDhBatterPlayer() != null) {
                    manualPlayerIds.add(entry.getDhBatterPlayer().getId());
                }
            } else {
                if (entry.getDhBatterPlayer() != null) {
                    manualPlayerIds.add(entry.getDhBatterPlayer().getId());
                }
            }
        }

        // Alle neun Feldposten werden jedes Mal neu verteilt
        final List<Position> positionsToFill = new ArrayList<>(AUTO_POSITIONS);

        // Kandidaten: verfuegbar, nicht manuell gesetzt, kein Base-Coach, kein DH-Batter.
        //
        // Reihenfolge:
        //   1. Wer an diesem Spieltag noch gar nicht gespielt hat — jeder, der da ist,
        //      soll mindestens einmal aufs Feld.
        //   2. Trainingsbeteiligung, absteigend — wer oefter im Training steht, spielt mehr.
        //      Quote, nicht Zaehler: ein Neuzugang soll nicht dafuer buessen, dass er die
        //      ersten Monate der Saison gar nicht dabei sein konnte.
        //   3. Spiele an diesem Spieltag, aufsteigend — verteilt die Zusatzspiele.
        // Vorher gemischt, damit gleich Platzierte nicht immer gleich einlaufen.
        final List<Long> candidates = playerMap.keySet().stream()
            .filter(id -> !manualPlayerIds.contains(id))
            .filter(id -> !staffIds.contains(id))
            .collect(Collectors.toCollection(ArrayList::new));
        Collections.shuffle(candidates, random);
        candidates.sort(Comparator
            .comparingInt((Long id) -> gamesPlayedCount.getOrDefault(id, 0) > 0 ? 1 : 0)
            .thenComparingDouble((Long id) -> -participationByPlayer.getOrDefault(id, 0.0))
            .thenComparingInt((Long id) -> gamesPlayedCount.getOrDefault(id, 0)));

        // Wer aufs Feld kommt — danach die Frauen-Quote nachziehen
        final List<Long> assignablePool =
            selectFielders(candidates, playerMap, gamesPlayedCount, positionsToFill.size());

        // Posten verteilen: Positions-Profil zuerst, offene Posten mit dem Rest auffuellen
        final Map<Long, Position> newAssignments =
            assignPositions(assignablePool, playerMap, positionsToFill, random);
        ensureWomanInInfield(newAssignments, playerMap);

        // Build final result: manual entries first, then new assignments
        final List<SuggestionResult> result = new ArrayList<>();
        int order = 1;

        for (final LineupEntry entry : manualEntries) {
            result.add(new SuggestionResult(entry.getPlayer().getId(), entry.getPlayer().getName(),
                entry.getPosition() != null ? entry.getPosition().displayName() : null, order++));
        }

        // Schlagreihenfolge: wer eine feste Nummer hat, zuerst — der Rest gemischt
        final boolean anyHasOrder = newAssignments.keySet().stream()
            .anyMatch(id -> playerMap.get(id) != null && playerMap.get(id).getDefaultBattingOrder() != null);
        final List<Map.Entry<Long, Position>> assignmentList = new ArrayList<>(newAssignments.entrySet());
        if (anyHasOrder) {
            // Shuffle first so unranked players get a random batting order
            Collections.shuffle(assignmentList, random);
            // Stable sort: ranked players sorted by order, unranked stay shuffled at end
            assignmentList.sort(Comparator.comparingInt(e -> {
                final Player p = playerMap.get(e.getKey());
                return (p != null && p.getDefaultBattingOrder() != null) ? p.getDefaultBattingOrder() : Integer.MAX_VALUE;
            }));
        } else {
            Collections.shuffle(assignmentList, random);
        }
        for (final var entry : assignmentList) {
            final Player player = playerMap.get(entry.getKey());
            if (player != null) {
                result.add(new SuggestionResult(player.getId(), player.getName(),
                    entry.getValue().displayName(), order++));
            }
        }

        return result;
    }


    /**
     * Die nach Reihenfolge Besten aufs Feld — danach die Frauen-Quote erzwingen.
     *
     * Sind zwei Frauen da, stehen auch zwei auf dem Feld, unabhaengig von
     * Trainingsbeteiligung: die Quote ist eine Liga-Regel, kein Kriterium. Weichen
     * muss, wer in der Reihenfolge am weitesten unten steht — und unter denen
     * zuerst, wer an diesem Spieltag schon gespielt hat. Sind nicht genug Frauen
     * verfuegbar, bleibt es dabei; dann meldet es die Regel im Editor.
     */
    private List<Long> selectFielders(final List<Long> candidates,
                                      final Map<Long, Player> playerMap,
                                      final Map<Long, Integer> gamesPlayedCount,
                                      final int slots) {
        final List<Long> pool = new ArrayList<>(candidates.subList(0, Math.min(slots, candidates.size())));
        long women = pool.stream().filter(id -> isFemale(playerMap, id)).count();
        if (women >= LineupGenderRule.MIN_WOMEN_ON_FIELD) return pool;

        final List<Long> waiting = candidates.stream()
            .skip(pool.size())
            .filter(id -> isFemale(playerMap, id))
            .toList();

        for (final Long woman : waiting) {
            if (women >= LineupGenderRule.MIN_WOMEN_ON_FIELD) break;
            final int replace = indexToReplace(pool, playerMap, gamesPlayedCount);
            if (replace < 0) break;
            pool.set(replace, woman);
            women++;
        }
        return pool;
    }

    /** Von hinten: erst jemand, der heute schon gespielt hat, sonst der Letzte. */
    private int indexToReplace(final List<Long> pool,
                               final Map<Long, Player> playerMap,
                               final Map<Long, Integer> gamesPlayedCount) {
        int fallback = -1;
        for (int i = pool.size() - 1; i >= 0; i--) {
            final Long id = pool.get(i);
            if (isFemale(playerMap, id)) continue;
            if (gamesPlayedCount.getOrDefault(id, 0) > 0) return i;
            if (fallback < 0) fallback = i;
        }
        return fallback;
    }

    /**
     * Posten verteilen: Profil zuerst, Rest auffuellen.
     *
     * In jedem Schritt kommt der Posten dran, fuer den es gerade die wenigsten
     * passenden Profile gibt — sonst schnappt sich ein Posten ohne Profil-Anwaerter
     * den einzigen Pitcher, bevor P an der Reihe ist. Erst wenn fuer keinen offenen
     * Posten mehr jemand ein Profil hat, wird nach Fairness aufgefuellt.
     */
    private Map<Long, Position> assignPositions(final List<Long> pool,
                                                final Map<Long, Player> playerMap,
                                                final List<Position> positions,
                                                final Random random) {
        final Map<Long, Integer> fairnessIndex = new HashMap<>();
        for (int i = 0; i < pool.size(); i++) fairnessIndex.put(pool.get(i), i);

        final List<Position> open = new ArrayList<>(positions);
        Collections.shuffle(open, random);
        final List<Long> free = new ArrayList<>(pool);
        final Map<Long, Position> assignments = new LinkedHashMap<>();

        while (!open.isEmpty() && !free.isEmpty()) {
            Position scarcest = null;
            List<Long> scarcestCandidates = null;
            for (final Position position : open) {
                final List<Long> fitting = free.stream()
                    .filter(id -> profileRank(playerMap.get(id), position) < NO_PROFILE)
                    .toList();
                if (fitting.isEmpty()) continue;
                if (scarcestCandidates == null || fitting.size() < scarcestCandidates.size()) {
                    scarcest = position;
                    scarcestCandidates = fitting;
                }
            }

            if (scarcest == null) {
                // Niemand hat mehr ein Profil fuer die offenen Posten — nach Fairness auffuellen.
                for (final Position position : new ArrayList<>(open)) {
                    if (free.isEmpty()) break;
                    final Long next = free.stream()
                        .min(Comparator.comparingInt(id -> fairnessIndex.getOrDefault(id, Integer.MAX_VALUE)))
                        .orElseThrow();
                    assignments.put(next, position);
                    free.remove(next);
                    open.remove(position);
                }
                break;
            }

            final Position position = scarcest;
            final Long best = scarcestCandidates.stream()
                .min(Comparator
                    .comparingInt((Long id) -> profileRank(playerMap.get(id), position))
                    .thenComparingInt(id -> fairnessIndex.getOrDefault(id, Integer.MAX_VALUE)))
                .orElseThrow();
            assignments.put(best, position);
            free.remove(best);
            open.remove(position);
        }
        return assignments;
    }

    /**
     * Mindestens eine Frau im Infield. Steht dort keine, tauscht die Frau mit dem
     * Mann, bei dem beide hinterher am besten passen — gemessen am Positions-Profil.
     */
    private void ensureWomanInInfield(final Map<Long, Position> assignments, final Map<Long, Player> playerMap) {
        final boolean covered = assignments.entrySet().stream()
            .anyMatch(e -> LineupGenderRule.isInfield(e.getValue()) && isFemale(playerMap, e.getKey()));
        if (covered) return;

        Long bestWoman = null;
        Long bestMan = null;
        int bestCost = Integer.MAX_VALUE;
        for (final var woman : assignments.entrySet()) {
            if (!isFemale(playerMap, woman.getKey())) continue;
            for (final var man : assignments.entrySet()) {
                if (!LineupGenderRule.isInfield(man.getValue()) || isFemale(playerMap, man.getKey())) continue;
                final int cost = profileRank(playerMap.get(woman.getKey()), man.getValue())
                    + profileRank(playerMap.get(man.getKey()), woman.getValue());
                if (cost < bestCost) {
                    bestCost = cost;
                    bestWoman = woman.getKey();
                    bestMan = man.getKey();
                }
            }
        }
        if (bestWoman == null || bestMan == null) return;

        final Position womanPosition = assignments.get(bestWoman);
        assignments.put(bestWoman, assignments.get(bestMan));
        assignments.put(bestMan, womanPosition);
    }

    private boolean isFemale(final Map<Long, Player> playerMap, final Long id) {
        final Player player = playerMap.get(id);
        return player != null && player.getGender() == Gender.FEMALE;
    }

    /** 1 = Erstposition, 2 = Zweit-, 3 = Drittposition, {@value #NO_PROFILE} = kein Profil dafuer. */
    private int profileRank(final Player player, final Position position) {
        if (player == null) return NO_PROFILE;
        final PositionSlot[] ordered = { player.getPrimaryPosition(), player.getSecondaryPosition(), player.getTertiaryPosition() };
        for (int i = 0; i < ordered.length; i++) {
            if (ordered[i] != null && ordered[i].expand().contains(position)) return i + 1;
        }
        return NO_PROFILE;
    }

    public Map<Long, Integer> countGamesPlayed(final List<LineupEntry> allEntries, final Long excludeGameId) {
        final Map<Long, Integer> count = new HashMap<>();
        for (final LineupEntry entry : allEntries) {
            if (excludeGameId != null && entry.getGame().getId().equals(excludeGameId)) {
                continue;
            }
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), 1, Integer::sum);
            }
        }
        return count;
    }

    public void addToCount(final Map<Long, Integer> count, final List<LineupEntry> entries) {
        for (final LineupEntry entry : entries) {
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), 1, Integer::sum);
            }
        }
    }

    public void subtractFromCount(final Map<Long, Integer> count, final List<LineupEntry> entries) {
        for (final LineupEntry entry : entries) {
            if (entry.getPosition() != null) {
                count.merge(entry.getPlayer().getId(), -1, (current, delta) -> Math.max(0, current + delta));
            }
        }
    }
}
