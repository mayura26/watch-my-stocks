'use client';

import { useEffect, useState } from 'react';

export function VersionIndicator() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Fetch version from API
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => setVersion(data.version || ''))
      .catch(() => setVersion(''));
  }, []);

  if (!version) {
    return null;
  }

  return (
    <div className="px-2 py-1.5 text-xs text-muted-foreground">
      v{version}
    </div>
  );
}

