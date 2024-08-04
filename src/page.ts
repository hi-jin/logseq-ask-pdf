import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";

export function findPageProperty(
    page: PageEntity | BlockEntity | null,
    propertyName: string,
) {
    const properties = page?.properties ?? {};
    return properties[propertyName];
}