"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell, {
  EmptyState,
  ErrorText,
  FieldInput,
  Label,
  Panel,
  PrimaryButton,
  SecondaryButton,
} from "@/app/components/AppShell";
import {
  createPart,
  deletePart,
  listParts,
  updatePartStatus,
} from "@/lib/parts";
import { supabase } from "@/lib/supabase";
import {
  listMyTeams,
  listTeamMembers,
  memberCanManageInventory,
} from "@/lib/teams";
import {
  PART_STATUSES,
  type Part,
  type PartStatus,
  type Team,
  type TeamMember,
} from "@/lib/types";

export default function PartsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [filter, setFilter] = useState<PartStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");

  const selectedTeam = teams.find((t) => t.id === teamId) ?? null;
  const myMembership = members.find((m) => m.user_id === userId) ?? null;
  const canManage =
    selectedTeam && userId
      ? memberCanManageInventory(selectedTeam, userId, myMembership)
      : false;

  const refresh = useCallback(async (tid: string) => {
    const [p, m] = await Promise.all([listParts(tid), listTeamMembers(tid)]);
    setParts(p);
    setMembers(m);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setUserId(user.id);
      try {
        const myTeams = await listMyTeams();
        if (!mounted) return;
        setTeams(myTeams);
        setTeamId(myTeams[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load teams");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!teamId) return;
    refresh(teamId).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load parts")
    );
  }, [teamId, refresh]);

  const visible =
    filter === "all" ? parts : parts.filter((p) => p.status === filter);

  const handleCreate = async () => {
    if (!userId || !teamId || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createPart({
        teamId,
        name,
        sku,
        notes,
        createdBy: userId,
      });
      setName("");
      setSku("");
      setNotes("");
      await refresh(teamId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      eyebrow="Inventory"
      title="Parts"
      actions={
        <FieldInput
          as="select"
          className="w-48"
          value={teamId ?? ""}
          onChange={(e) => setTeamId(e.target.value || null)}
        >
          {teams.length === 0 ? <option value="">No teams</option> : null}
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </FieldInput>
      }
    >
      <ErrorText>{error}</ErrorText>

      {!teamId ? (
        <Panel>
          <EmptyState>Join a team to manage inventory.</EmptyState>
        </Panel>
      ) : (
        <>
          {canManage ? (
            <Panel className="space-y-3">
              <Label>Add part</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldInput
                  placeholder="Part name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldInput
                  placeholder="SKU / type"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
                <FieldInput
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <PrimaryButton disabled={busy || !name.trim()} onClick={handleCreate}>
                Add to inventory
              </PrimaryButton>
            </Panel>
          ) : (
            <Panel>
              <EmptyState>You can view inventory; ask an admin for edit access.</EmptyState>
            </Panel>
          )}

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All (${parts.length})`}
            />
            {PART_STATUSES.map((s) => (
              <FilterChip
                key={s.id}
                active={filter === s.id}
                onClick={() => setFilter(s.id)}
                label={`${s.label} (${parts.filter((p) => p.status === s.id).length})`}
              />
            ))}
          </div>

          <div className="space-y-2">
            {visible.length === 0 ? (
              <Panel>
                <EmptyState>No parts in this filter.</EmptyState>
              </Panel>
            ) : (
              visible.map((part) => (
                <Panel key={part.id} className="!p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{part.name}</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">
                      {part.sku ? `SKU ${part.sku}` : "No SKU"}
                      {part.notes ? ` · ${part.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <FieldInput
                        as="select"
                        className="w-40"
                        value={part.status}
                        onChange={async (e) => {
                          try {
                            await updatePartStatus(
                              part.id,
                              e.target.value as PartStatus
                            );
                            if (teamId) await refresh(teamId);
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Status update failed"
                            );
                          }
                        }}
                      >
                        {PART_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </FieldInput>
                    ) : (
                      <span className="text-[10px] font-mono uppercase text-zinc-500">
                        {part.status}
                      </span>
                    )}
                    {canManage ? (
                      <SecondaryButton
                        onClick={async () => {
                          try {
                            await deletePart(part.id);
                            if (teamId) await refresh(teamId);
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Delete failed"
                            );
                          }
                        }}
                      >
                        Delete
                      </SecondaryButton>
                    ) : null}
                  </div>
                </Panel>
              ))
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors ${
        active
          ? "border-zinc-500 bg-zinc-900 text-white"
          : "border-zinc-900 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}
