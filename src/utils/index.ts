


export function createPageUrl(pageName: string) {
    // Convert PascalCase to kebab-case and lowercase
    return '/' + pageName
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/ /g, '-')
        .toLowerCase();
}