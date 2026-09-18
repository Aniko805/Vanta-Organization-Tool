"use client";

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
  listPartStatuses,
  listParts,
  updatePartQuantity,
  updatePartStatus,
} from "@/lib/parts";
import { supabase } from "@/lib/supabase";
import {
  listMyTeams,
  listTeamMembers,
  memberCanManageInventory,
} from "@/lib/teams";
import { type Part, type StatusList, type Team, type TeamMember } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function PartsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [statuses, setStatuses] = useState<StatusList[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState<number>(1);

  const selectedTeam = teams.find((t) => t.id === teamId) ?? null;
  const myMembership = members.find((m) => m.user_id === userId) ?? null;
  const canManage =
    selectedTeam && userId
      ? memberCanManageInventory(selectedTeam, userId, myMembership)
      : false;

  const refresh = useCallback(async (tid: string) => {
    setLoading(true);
    try {
      const [p, m, s] = await Promise.all([
        listParts(tid),
        listTeamMembers(tid),
        listPartStatuses(tid),
      ]);
      setParts(p);
      setMembers(m);
      setStatuses(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load parts");
    } finally {
      setLoading(false);
    }
  }, []);

  const commitQuantity = async (partStatusId: string, raw: string) => {
    const parsed = Math.max(0, parseInt(raw, 10) || 0);
    try {
      await updatePartQuantity(partStatusId, parsed);
      if (teamId) await refresh(teamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    }
  };

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
    const loadData = async () => {
      await refresh(teamId);
    };
    loadData();
  }, [teamId, refresh]);

  const visible =
    filter === "all"
      ? parts
      : parts.filter((p) =>
          p.part_status?.some(
            (ps) =>
              ps.status_id === filter ||
              ps.status_list?.id === filter ||
              ps.status_list?.name === filter ||
              ps.name === filter
          )
        );

  const handleCreate = async () => {
    if (!userId || !teamId || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const initialStatus =
        statuses.find((status) => status.is_default) ??
        statuses.find((status) => status.name === "PLANNING") ??
        statuses[0];

      if (!initialStatus) {
        throw new Error("No inventory statuses are configured for this team.");
      }

      // 1. Insert into part_catalog
      const { data: catalogData, error: catalogError } = await supabase
        .from("part_catalog")
        .insert({
          name,
          sku: sku || null,
          description: notes || null,
          team_id: teamId,
          created_by: userId,
        })
        .select()
        .single();

      if (catalogError) throw new Error(catalogError.message);

      // 2. Create actual Part relation
      const part = await createPart({
        teamId,
        catalogId: catalogData.id,
        createdBy: userId,
      });

      // 3. Insert initial status tracking entry
      const { error: statusError } = await supabase.from("part_status").insert({
        part_id: part.id,
        status_id: initialStatus.id,
        name: initialStatus.name,
        quantity,
        created_by: userId,
      });

      if (statusError) throw new Error(statusError.message);

      setName("");
      setSku("");
      setNotes("");
      setQuantity(1);
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                <FieldInput
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
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
            {statuses.map((status) => {
              const count = parts.filter((p) =>
                p.part_status?.some(
                  (ps) =>
                    ps.status_id === status.id ||
                    ps.status_list?.id === status.id ||
                    ps.status_list?.name === status.name ||
                    ps.name === status.name
                )
              ).length;

              return (
                <FilterChip
                  key={status.id}
                  active={filter === status.id}
                  onClick={() => setFilter(status.id)}
                  label={`${status.name} (${count})`}
                />
              );
            })}
          </div>

          <div className="space-y-2">
            {loading ? (
              <Panel>
                <EmptyState>Loading parts…</EmptyState>
              </Panel>
            ) : visible.length === 0 ? (
              <Panel>
                <EmptyState>No parts in this filter.</EmptyState>
              </Panel>
            ) : (
              visible.map((part) => {
                const catalog = part.part_catalog;
                const statusRecord = part.part_status?.[0];
                const currentQty = statusRecord?.quantity ?? 1;
                const currentStatusId =
                  statusRecord?.status_list?.id ??
                  statuses.find((status) => status.id === statusRecord?.status_id)?.id ??
                  statuses.find((status) => status.name === statusRecord?.name)?.id ??
                  "";
                const currentStatusName =
                  statusRecord?.status_list?.name ?? statusRecord?.name ?? "Unknown";

                return (
                  <Panel key={part.id} className="!p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {catalog?.name ?? "Unnamed Part"}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 mt-1">
                        {catalog?.sku ? `SKU ${catalog.sku}` : "No SKU"}
                        {catalog?.description ? ` · ${catalog.description}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {canManage && statusRecord ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(0, currentQty - 1);
                              setParts((prev) =>
                                prev.map((p) =>
                                  p.id === part.id && p.part_status?.[0]
                                    ? {
                                        ...p,
                                        part_status: [
                                          { ...p.part_status[0], quantity: newQty },
                                          ...p.part_status.slice(1),
                                        ],
                                      }
                                    : p
                                )
                              );
                              commitQuantity(statusRecord.id, String(newQty));
                            }}
                            className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-sm font-bold text-zinc-300"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={currentQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const next = isNaN(val) ? 0 : Math.max(0, val);
                              setParts((prev) =>
                                prev.map((p) =>
                                  p.id === part.id && p.part_status?.[0]
                                    ? {
                                        ...p,
                                        part_status: [
                                          { ...p.part_status[0], quantity: next },
                                          ...p.part_status.slice(1),
                                        ],
                                      }
                                    : p
                                )
                              );
                            }}
                            onBlur={(e) => commitQuantity(statusRecord.id, e.target.value)}
                            className="w-14 text-center bg-black border border-zinc-800 rounded py-1 text-sm text-white font-mono"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const newQty = currentQty + 1;
                              setParts((prev) =>
                                prev.map((p) =>
                                  p.id === part.id && p.part_status?.[0]
                                    ? {
                                        ...p,
                                        part_status: [
                                          { ...p.part_status[0], quantity: newQty },
                                          ...p.part_status.slice(1),
                                        ],
                                      }
                                    : p
                                )
                              );
                              commitQuantity(statusRecord.id, String(newQty));
                            }}
                            className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-sm font-bold text-zinc-300"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-mono text-zinc-400">
                          Qty: {currentQty}
                        </span>
                      )}

                      {canManage && statusRecord ? (
                        <FieldInput
                          as="select"
                          className="w-40"
                          value={currentStatusId}
                          onChange={async (e) => {
                            try {
                              await updatePartStatus(statusRecord.id, e.target.value);
                              if (teamId) await refresh(teamId);
                            } catch (err) {
                              setError(
                                err instanceof Error ? err.message : "Status update failed"
                              );
                            }
                          }}
                        >
                          {statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.name}
                            </option>
                          ))}
                        </FieldInput>
                      ) : (
                        <span className="text-[10px] font-mono uppercase text-zinc-500">
                          {currentStatusName}
                        </span>
                      )}

                      {canManage ? (
                        <SecondaryButton
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Are you sure you want to delete "${catalog?.name ?? "this part"}"? This cannot be undone.`
                              )
                            )
                              return;
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
                );
              })
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