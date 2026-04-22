import { useRef, useState, useEffect } from 'react';

export const usePullToRefresh = (onRefresh, isDisabled = false) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollTop = useRef(0);
  const containerRef = useRef(null);
  const PULL_THRESHOLD = 80;

  useEffect(() => {
    const element = containerRef.current;
    if (!element || isDisabled) return;

    const handleTouchStart = (e) => {
      const target = element;
      scrollTop.current = target.scrollTop;
      if (scrollTop.current === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (scrollTop.current !== 0 || isDisabled) return;
      const touchY = e.touches[0].clientY;
      const distance = Math.max(0, touchY - touchStartY.current);
      setPullDistance(Math.min(distance, PULL_THRESHOLD + 40));
      
      if (distance > 0) {
        e.preventDefault?.();
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= PULL_THRESHOLD && !isDisabled) {
        setIsPulling(true);
        try {
          await onRefresh();
        } finally {
          setIsPulling(false);
        }
      }
      setPullDistance(0);
      touchStartY.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, pullDistance, isDisabled]);

  return { containerRef, isPulling, pullDistance, PULL_THRESHOLD };
};