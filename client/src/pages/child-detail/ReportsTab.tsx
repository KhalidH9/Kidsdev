import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { messageFor } from '../../lib/errors';

export function ReportsTab({ childId, childName }: { childId: string; childName: string }) {
  const { role } = useAuth();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const canDownload = role === 'admin' || role === 'specialist';

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await api.getBlob(`/reports/child/${childId}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${childName.replace(/\s+/g, '-')}-progress.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success({ title: 'Report ready.' });
    } catch (e) {
      toast.error({
        title: "We couldn't generate that report.",
        body: messageFor(e),
      });
    } finally {
      setDownloading(false);
    }
  };

  if (!canDownload) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="Reports aren't available for your role."
        body="Ask a specialist if you need a PDF of this child's progress."
      />
    );
  }

  return (
    <div className="rounded-md border border-line bg-white p-5">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1">
          <h3 className="text-h3 text-ink">Progress report</h3>
          <p className="mt-1 text-small text-ink-muted">
            One PDF with {childName}'s profile, active goals, reinforcement plans, and the
            most recent behavior logs.
          </p>
          <div className="mt-4">
            <Button
              loading={downloading}
              onClick={download}
              iconStart={<Download className="h-4 w-4" aria-hidden />}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
