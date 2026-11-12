/** Closer than this to the end counts as "reading the latest" */
export const NEAR_BOTTOM_PX = 120;

export function isNearBottom(
    el: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">,
    threshold = NEAR_BOTTOM_PX
): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

/** Items not seen before (by id); local outbox entries sit after newer server messages, so order can't tell */
export function unseenItems<T extends { id: string }>(items: T[], seen: ReadonlySet<string>): T[] {
    return items.filter((m) => !seen.has(m.id));
}
