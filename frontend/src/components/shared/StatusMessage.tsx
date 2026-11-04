type StatusMessageProps = {
    status: 'loading' | 'error' | 'ready';
    isEmpty: boolean;
    showLoading?: boolean;
    emptyMessage?: string;
    messages: {
        loadingTarget: string;
        error: string;
        empty: string;
    };
};

export function StatusMessage({ status, isEmpty, messages, showLoading = false, emptyMessage }: StatusMessageProps) {
    if (status === 'loading') return showLoading
        ? <p role="status">Cargando {messages.loadingTarget}...</p>
        : <div className="loading-feedback" role="status" aria-label={`Cargando ${messages.loadingTarget}`}>
            <span className="loading-spinner" aria-hidden="true" />
        </div>;
    if (status === 'error') return <p role="alert">{messages.error}</p>;
    return isEmpty ? <p>{emptyMessage ?? messages.empty}</p> : null;
}
