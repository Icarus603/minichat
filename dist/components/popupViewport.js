export function getVisibleWindow(items, selectedIndex, maxVisibleItems) {
    if (items.length === 0) {
        return {
            visibleItems: [],
            startIndex: 0,
        };
    }
    const visibleCount = Math.max(1, Math.min(maxVisibleItems, items.length));
    const clampedIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
    const half = Math.floor(visibleCount / 2);
    let startIndex = Math.max(0, clampedIndex - half);
    if (startIndex + visibleCount > items.length) {
        startIndex = Math.max(0, items.length - visibleCount);
    }
    return {
        visibleItems: items.slice(startIndex, startIndex + visibleCount),
        startIndex,
    };
}
