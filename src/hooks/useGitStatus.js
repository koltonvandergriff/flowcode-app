import { useState, useCallback, useEffect, useRef } from 'react';

export function useGitStatus(cwd) {
  const [files, setFiles] = useState([]);
  const [branch, setBranch] = useState(null);
  const [error, setError] = useState(null);
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;

  const refresh = useCallback(async () => {
    const dir = cwdRef.current;
    if (!dir || !window.flowade?.git) { setFiles([]); return; }
    try {
      const [statusResult, branchResult] = await Promise.all([
        window.flowade.git.status(dir),
        window.flowade.git.branch(dir),
      ]);
      if (cwdRef.current !== dir) return;
      setFiles(statusResult.files || []);
      setBranch(branchResult.branch);
      setError(statusResult.error || null);
    } catch (e) {
      setError(e.message);
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [cwd, refresh]);

  return { files, branch, error, refresh };
}
