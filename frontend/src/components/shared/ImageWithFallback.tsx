import { useState } from 'react';
import imagePlaceholder from '../../assets/images/placeholder.png';

type ImageWithFallbackProps = {
    src?: string;
    alt: string;
};

export function ImageWithFallback(props: ImageWithFallbackProps) {
    return <FallbackImage key={props.src} {...props} />;
}

function FallbackImage({ src, alt }: ImageWithFallbackProps) {
    const [failed, setFailed] = useState(false);
    const imageSrc = src?.trim();
    const usePlaceholder = failed || !imageSrc;

    return (
        <img
            src={usePlaceholder ? imagePlaceholder : imageSrc}
            alt={alt}
            data-fallback={usePlaceholder}
            onError={() => setFailed(true)}
        />
    );
}
