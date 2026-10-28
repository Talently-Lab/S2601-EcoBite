export function getUserNamePresentation(name: string | null | undefined) {
    const displayName = name?.trim() ?? '';
    const nameParts = displayName ? displayName.split(/\s+/) : [];

    return {
        displayName,
        firstName: nameParts[0] ?? '',
        initials: nameParts.slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
    };
}
