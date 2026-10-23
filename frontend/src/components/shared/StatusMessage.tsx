type StatusMessageProps = {
    status: 'loading' | 'error' | 'ready';
    isEmpty: boolean;
    messages: {
        loadingTarget: string;
        error: string;
        empty: string;
    };
};

const MESSAGE_ROLES = {
    loading: 'status',
    error: 'alert',
    empty: undefined,
} as const;

export function StatusMessage({ status, isEmpty, messages }: StatusMessageProps) {
    const messageKey = status === 'ready' ? (isEmpty ? 'empty' : null) : status;
    const messageText = {
        loading: `Cargando ${messages.loadingTarget}...`,
        error: messages.error,
        empty: messages.empty,
    };

    return messageKey ? <p role={MESSAGE_ROLES[messageKey]}>{messageText[messageKey]}</p> : null;
}
