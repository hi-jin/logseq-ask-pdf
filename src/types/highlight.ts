export default interface Highlight {
    id: {
        val: string,
    },
    content: {
        text: string,
        image?: number,
    },
    position: {
        bounding: {
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            width: number,
            height: number,
        },
        page: number,
    }
};
