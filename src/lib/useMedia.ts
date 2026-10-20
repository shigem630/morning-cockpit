import { useEffect, useState } from 'react';

/** スマホ幅かどうか。CSS の @media (max-width: 760px) と同じ境目にしておくこと。 */
export const PHONE_QUERY = '(max-width: 760px)';

export function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setOn(m.matches);
    m.addEventListener('change', onChange);
    onChange();
    return () => m.removeEventListener('change', onChange);
  }, [query]);
  return on;
}
