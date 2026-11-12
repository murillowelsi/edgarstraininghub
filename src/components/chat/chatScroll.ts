/** Closer than this to the end counts as "reading the latest" */
export const NEAR_BOTTOM_PX = 120;

export function isNearBottom(
    el: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">,
    threshold = NEAR_BOTTOM_PX
): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

/**
 * Messages that arrived after the one last seen. With no previous id (first load)
 * or an id no longer in the list (history replaced), nothing counts as new.
 */
export function newMessagesSince<T extends { id: string }>(messages: T[], lastSeenId: string | null): T[] {
    if (lastSeenId === null) return [];
    const idx = messages.findIndex((m) => m.id === lastSeenId);
    return idx === -1 ? [] : messages.slice(idx + 1);
}
