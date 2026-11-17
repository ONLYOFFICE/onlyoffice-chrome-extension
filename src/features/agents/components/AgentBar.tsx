import { ComponentChildren, FunctionalComponent } from 'preact';

import { useI18n } from '@stores/i18n';

import { AIAgent } from '@utils/http';

import './bar.css';

interface AgentBarProps {
  readonly agents: AIAgent[];
  readonly selectedId: number | null;
  readonly canCreate: boolean;
  readonly busy: boolean;
  readonly onSelect: (agentId: number) => void;
  readonly onSavePage: () => void;
  readonly onDeleteAgent: () => void;
  readonly onNewAgent: () => void;
}

const BarButton: FunctionalComponent<{
  readonly label: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly children: ComponentChildren;
}> = ({
  label, disabled, onClick, children,
}) => (
  <button
    type="button"
    className="agent-bar__button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  </button>
);

export const AgentBar: FunctionalComponent<AgentBarProps> = ({
  agents,
  selectedId,
  canCreate,
  busy,
  onSelect,
  onSavePage,
  onDeleteAgent,
  onNewAgent,
}) => {
  const { t } = useI18n();
  const hasAgents = agents.length > 0;

  return (
    <header className="agent-bar">
      <div className="agent-bar__combobox">
        {hasAgents && (
          <select
            className="agent-bar__select"
            aria-label={t('agents.select_agent')}
            value={selectedId ?? ''}
            onChange={(event) => onSelect(Number((event.target as HTMLSelectElement).value))}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <BarButton label={t('agents.save_page')} disabled={!hasAgents || busy} onClick={onSavePage}>
        <path d="M4 1.75h5.5L12.25 4.5v9.75H4z" strokeLinecap="butt" />
        <path d="M8 6.5v5M5.75 9.25 8 11.5l2.25-2.25" />
      </BarButton>
      <BarButton label={t('agents.delete_agent')} disabled={selectedId === null || busy} onClick={onDeleteAgent}>
        <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4M6.75 6.75v4M9.25 6.75v4" />
      </BarButton>
      <BarButton label={t('agents.new_agent')} disabled={!canCreate || busy} onClick={onNewAgent}>
        <path d="M8 2.5v11M2.5 8h11" strokeLinejoin="miter" />
      </BarButton>
    </header>
  );
};
