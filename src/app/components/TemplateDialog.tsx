"use client";

import {
  cloneTemplate,
  createSection,
  createTab,
  deleteSection,
  deleteTab,
  globalTemplate,
  importTemplate,
  reorderSections,
  reorderTabs,
  setActiveTemplate,
  setTeamAi,
  templateToExport,
  updateSection,
  updateTab,
  validateTemplateImport,
} from "@/lib/notebook";
import { downloadText } from "@/lib/notebook-export";
import type { NotebookTemplate } from "@/lib/types";
import { useState } from "react";
import { ErrorText, FieldInput, Label, PrimaryButton, SecondaryButton } from "./AppShell";
import { BTN_SECONDARY, MODAL_BACKDROP, MODAL_SHEET } from "./ui";

type TemplateDialogProps = {
  teamId: string;
  templates: NotebookTemplate[];
  provider: "deepseek" | "moonshot" | null;
  model: string | null;
  onClose: () => void;
  onChanged: () => void;
};

export default function TemplateDialog({
  teamId,
  templates,
  provider,
  model,
  onClose,
  onChanged,
}: TemplateDialogProps) {
  const teamTemplates = templates.filter((template) => template.team_id === teamId);
  const active = teamTemplates.find((template) => template.is_default) ?? teamTemplates[0] ?? null;
  const shared = globalTemplate(templates);
  const [templateId, setTemplateId] = useState(active?.id ?? "");
  const [tabId, setTabId] = useState(active?.notebook_template_tabs?.[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiProvider, setAiProvider] = useState(provider ?? "");
  const [aiModel, setAiModel] = useState(model ?? "");

  const template = teamTemplates.find((item) => item.id === templateId) ?? active;
  const tabs = template?.notebook_template_tabs ?? [];
  const tab = tabs.find((item) => item.id === tabId) ?? tabs[0] ?? null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Template change failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={MODAL_BACKDROP}>
      <div className={`${MODAL_SHEET} max-w-3xl p-5`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-100">Notebook template</h2>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
        <ErrorText>{error}</ErrorText>

        <div className="mt-3 flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            disabled={busy || !shared}
            onClick={() =>
              run(async () => {
                if (!shared) return;
                const id = await cloneTemplate(shared.id, teamId);
                setTemplateId(id);
              })
            }
          >
            Fork default
          </SecondaryButton>
          <SecondaryButton
            type="button"
            disabled={busy || !template}
            onClick={() => {
              if (!template) return;
              downloadText(
                `${template.name}.notebook-template.json`,
                JSON.stringify(templateToExport(template), null, 2),
                "application/json"
              );
            }}
          >
            Export JSON
          </SecondaryButton>
          <label className={`${BTN_SECONDARY} cursor-pointer`}>
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void run(async () => {
                  let parsed: unknown;
                  try {
                    parsed = JSON.parse(await file.text());
                  } catch {
                    throw new Error("That file is not readable JSON.");
                  }
                  const payload = validateTemplateImport(parsed);
                  const id = await importTemplate(teamId, payload);
                  setTemplateId(id);
                });
              }}
            />
          </label>
        </div>

        {teamTemplates.length > 0 ? (
          <div className="mt-4 space-y-2">
            <Label>Team templates</Label>
            <FieldInput
              as="select"
              value={template?.id ?? ""}
              onChange={(event) => {
                setTemplateId(event.target.value);
                setTabId("");
              }}
            >
              {teamTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.is_default ? " · active" : ""}
                </option>
              ))}
            </FieldInput>
            {template && !template.is_default ? (
              <SecondaryButton
                type="button"
                disabled={busy}
                onClick={() => run(() => setActiveTemplate(template.id))}
              >
                Make active
              </SecondaryButton>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs font-mono text-zinc-500">
            Fork the default template before editing tabs.
          </p>
        )}

        {template && tab ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tabs</Label>
              {tabs.map((item, index) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`min-h-11 flex-1 rounded-xl border px-3 text-left text-xs font-mono uppercase transition-all duration-300 ease-out ${
                      item.id === tab.id
                        ? "border-emerald-400/40 bg-emerald-500/10 text-zinc-100"
                        : "border-white/10 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:border-white/20"
                    }`}
                    onClick={() => setTabId(item.id)}
                  >
                    {item.name}
                  </button>
                  <SecondaryButton
                    type="button"
                    className="min-h-11"
                    disabled={busy || index === 0}
                    onClick={() =>
                      run(async () => {
                        const ids = tabs.map((entry) => entry.id);
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                        await reorderTabs(template.id, ids);
                      })
                    }
                  >
                    Up
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    className="min-h-11"
                    disabled={busy || index === tabs.length - 1}
                    onClick={() =>
                      run(async () => {
                        const ids = tabs.map((entry) => entry.id);
                        [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                        await reorderTabs(template.id, ids);
                      })
                    }
                  >
                    Down
                  </SecondaryButton>
                </div>
              ))}
              <TabNameForm
                key={tab.id}
                label="Rename tab"
                initial={tab.name}
                busy={busy}
                onSubmit={(name) => run(() => updateTab(tab.id, name))}
              />
              <TabNameForm
                label="Add tab"
                busy={busy}
                onSubmit={(name) =>
                  run(async () => {
                    if (tabs.length >= 8) throw new Error("A template can have at most 8 tabs.");
                    const created = await createTab(template.id, name, tabs.length);
                    setTabId(created.id);
                  })
                }
              />
              <SecondaryButton
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await deleteTab(tab.id);
                    setTabId("");
                  })
                }
              >
                Delete tab
              </SecondaryButton>
            </div>

            <div className="space-y-2">
              <Label>Sections</Label>
              {(tab.notebook_template_sections ?? []).map((section, index, all) => (
                <div key={section.id} className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
                  <div className="flex gap-2">
                    <FieldInput
                      defaultValue={section.name}
                      aria-label={`Rename ${section.name}`}
                      onBlur={(event) => {
                        const name = event.target.value.trim();
                        if (name && name !== section.name) void run(() => updateSection(section.id, { name }));
                      }}
                    />
                    <SecondaryButton
                      type="button"
                      className="min-h-11"
                      disabled={busy || index === 0}
                      onClick={() =>
                        run(async () => {
                          const ids = all.map((entry) => entry.id);
                          [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                          await reorderSections(tab.id, ids);
                        })
                      }
                    >
                      Up
                    </SecondaryButton>
                    <SecondaryButton
                      type="button"
                      className="min-h-11"
                      disabled={busy || index === all.length - 1}
                      onClick={() =>
                        run(async () => {
                          const ids = all.map((entry) => entry.id);
                          [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                          await reorderSections(tab.id, ids);
                        })
                      }
                    >
                      Down
                    </SecondaryButton>
                  </div>
                  <FieldInput
                    as="textarea"
                    defaultValue={section.prompt_hint ?? ""}
                    placeholder="Prompt hint"
                    onBlur={(event) => {
                      const promptHint = event.target.value;
                      if (promptHint !== (section.prompt_hint ?? "")) {
                        void run(() => updateSection(section.id, { promptHint }));
                      }
                    }}
                  />
                  <SecondaryButton type="button" disabled={busy} onClick={() => run(() => deleteSection(section.id))}>
                    Delete section
                  </SecondaryButton>
                </div>
              ))}
              <TabNameForm
                label="Add section"
                busy={busy}
                onSubmit={(name) =>
                  run(async () => {
                    const count = tab.notebook_template_sections?.length ?? 0;
                    if (count >= 12) throw new Error("A tab can have at most 12 sections.");
                    await createSection(tab.id, name, count);
                  })
                }
              />
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
          <Label>Curation provider</Label>
          <div className="grid gap-2 md:grid-cols-2">
            <FieldInput
              as="select"
              aria-label="AI provider"
              value={aiProvider}
              onChange={(event) => setAiProvider(event.target.value)}
            >
              <option value="">No provider</option>
              <option value="deepseek">DeepSeek</option>
              <option value="moonshot">Moonshot</option>
            </FieldInput>
            <FieldInput
              aria-label="Model name"
              placeholder={aiProvider === "moonshot" ? "moonshot-v1-128k" : "deepseek-chat"}
              value={aiModel}
              onChange={(event) => setAiModel(event.target.value)}
            />
          </div>
          <PrimaryButton
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                setTeamAi(teamId, aiProvider === "" ? null : aiProvider, aiModel.trim() || null)
              )
            }
          >
            Save provider
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function TabNameForm({
  label,
  initial = "",
  busy,
  onSubmit,
}: {
  label: string;
  initial?: string;
  busy: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        if (!initial) setName("");
      }}
    >
      <FieldInput
        aria-label={label}
        placeholder={label}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <PrimaryButton type="submit" className="min-h-11" disabled={busy}>
        {label}
      </PrimaryButton>
    </form>
  );
}
