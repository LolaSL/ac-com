import { useEffect, useRef } from "react";

/**
 * Custom hook for scroll-based animations using Intersection Observer API
 * Triggers animations when elements come into view
 */
export const useScrollAnimation = (options = {}) => {
    const elementRef = useRef(null);
    const [isVisible, setIsVisible] = React.useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                // Stop observing after element is visible once
                observer.unobserve(entry.target);
            }
        }, {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || "0px 0px -50px 0px",
        });

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            if (elementRef.current) {
                observer.unobserve(elementRef.current);
            }
        };
    }, [options.threshold, options.rootMargin]);

    return { elementRef, isVisible };
};

export default useScrollAnimation;
