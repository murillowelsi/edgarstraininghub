import AdminLayout from "@/components/AdminLayout";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";

const AdminTimeline = () => {
  return (
    <AdminLayout fullHeight>
      <TimelineFeed />
    </AdminLayout>
  );
};

export default AdminTimeline;
