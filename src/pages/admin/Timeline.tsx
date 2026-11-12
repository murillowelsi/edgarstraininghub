import { Megaphone } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimelineActions } from "@/contexts/TimelineActionsContext";

/** Coach feed: page header with "New notice", then the same 600px feed column. */
const AdminTimeline = () => {
  const { t } = useLanguage();
  const { setCreateOpen } = useTimelineActions();
  return (
    <AdminLayout fullHeight>
      <div className="flex h-full min-h-0 flex-col bg-feed-canvas">
        <div className="mx-auto hidden w-full max-w-[600px] px-0 pt-6 md:block [&>div]:md:mb-2">
          <AdminPageHeader
            title={t.timeline.coach.title}
            action={{ label: t.timeline.coach.newNotice, icon: Megaphone, onClick: () => setCreateOpen(true) }}
          />
        </div>
        <div className="min-h-0 flex-1">
          <TimelineFeed />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTimeline;
