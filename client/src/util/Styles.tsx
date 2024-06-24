interface RawStyle {
    [key: string]: string[];
}

export default function getStyle(styles: RawStyle, style: string) {
    return styles[style].join(' ') + ' ';
}