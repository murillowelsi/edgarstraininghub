import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAllAthletes, updateSubscription } from "@/services/usersService";
import { addSubscriptionHistory, getAthleteSubscriptionHistory, updateSubscriptionHistoryEntry, deleteSubscriptionHistoryEntry } from "@/services/subscriptionHistoryService";
import type { User, SubscriptionStatus, SubscriptionPlan, SubscriptionHistoryEntry } from "@/types/user";
import { format, addMonths, addYears } from "date-fns";
import {
    CalendarIcon,
    CheckCircle2,
    Clock,
    CreditCard,
    Edit,
    History,
    Loader2,
    TrendingUp,
    UserCheck,
    UserX,
    XCircle,
    AlertTriangle,
    Users,
    Trash2,
    DollarSign,
    FileText,
    Plus,
    MoreHorizontal
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/AdminLayout";

const statusConfig: Record<
    SubscriptionStatus,
    { label: string; color: string; icon: React.ElementType }
> = {
    active: {
        label: "Active",
        color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30",
        icon: CheckCircle2,
    },
    inactive: {
        label: "Inactive",
        color: "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-500/30",
        icon: XCircle,
    },
    expired: {
        label: "Expired",
        color: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/30",
        icon: AlertTriangle,
    },
    trial: {
        label: "Trial",
        color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30",
        icon: Clock,
    },
};

const planConfig: Record<SubscriptionPlan, { label: string; duration: number }> = {
    monthly: { label: "Monthly", duration: 1 },
    quarterly: { label: "Quarterly", duration: 3 },
    yearly: { label: "Yearly", duration: 12 },
    none: { label: "No Plan", duration: 0 },
};

const AdminSubscriptions = () => {
    const { user } = useAuth();
    const [athletes, setAthletes] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [registerPaymentOpen, setRegisterPaymentOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [athleteToActivate, setAthleteToActivate] = useState<User | null>(null);
    const [athleteToDeactivate, setAthleteToDeactivate] = useState<User | null>(null);
    const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
    const [athleteHistory, setAthleteHistory] = useState<SubscriptionHistoryEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // History Edit State
    const [editHistoryDialogOpen, setEditHistoryDialogOpen] = useState(false);
    const [historyEntryToEdit, setHistoryEntryToEdit] = useState<SubscriptionHistoryEntry | null>(null);
    const [historyEditPaymentAmount, setHistoryEditPaymentAmount] = useState("");
    const [historyEditPaymentMethod, setHistoryEditPaymentMethod] = useState("cash");
    const [historyEditNotes, setHistoryEditNotes] = useState("");
    const [historyEditDate, setHistoryEditDate] = useState<Date | undefined>(undefined);

    // Form States
    const [formStatus, setFormStatus] = useState<SubscriptionStatus>("inactive");
    const [formPlan, setFormPlan] = useState<SubscriptionPlan>("none");
    const [formStartDate, setFormStartDate] = useState<Date | undefined>(undefined);
    const [formEndDate, setFormEndDate] = useState<Date | undefined>(undefined);
    const [formPaymentAmount, setFormPaymentAmount] = useState("");
    const [formPaymentMethod, setFormPaymentMethod] = useState("cash");
    const [formNotes, setFormNotes] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        loadAthletes();
    }, []);

    const loadAthletes = async () => {
        try {
            const allAthletes = await getAllAthletes();
            setAthletes(allAthletes);
        } catch (error) {
            console.error("Error loading athletes:", error);
            toast({
                title: "Error",
                description: "Failed to load athletes.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const total = athletes.length;
        const active = athletes.filter((a) => a.subscriptionStatus === "active").length;
        const inactive = athletes.filter((a) => a.subscriptionStatus === "inactive").length;
        const expired = athletes.filter((a) => a.subscriptionStatus === "expired").length;
        const trial = athletes.filter((a) => a.subscriptionStatus === "trial").length;
        const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

        return { total, active, inactive, expired, trial, activeRate };
    }, [athletes]);

    // Plan distribution
    const planStats = useMemo(() => {
        const monthly = athletes.filter((a) => a.subscriptionPlan === "monthly" && a.subscriptionStatus === "active").length;
        const quarterly = athletes.filter((a) => a.subscriptionPlan === "quarterly" && a.subscriptionStatus === "active").length;
        const yearly = athletes.filter((a) => a.subscriptionPlan === "yearly" && a.subscriptionStatus === "active").length;
        return { monthly, quarterly, yearly };
    }, [athletes]);

    const openEditDialog = (athlete: User) => {
        setSelectedAthlete(athlete);
        setFormStatus(athlete.subscriptionStatus);
        setFormPlan(athlete.subscriptionPlan);
        setFormStartDate(athlete.subscriptionStartDate || new Date());
        setFormEndDate(athlete.subscriptionEndDate || undefined);
        setFormPaymentAmount("");
        setFormNotes("");
        setEditDialogOpen(true);
    };

    const openRegisterPaymentDialog = (athlete: User) => {
        setAthleteToActivate(athlete);
        // Default values for new payment
        setFormPlan("monthly");
        const start = new Date();
        setFormStartDate(start);
        setFormEndDate(addMonths(start, 1));
        setFormPaymentAmount("");
        setFormPaymentMethod("cash");
        setFormNotes("");
        setRegisterPaymentOpen(true);
    };

    const openHistoryDialog = async (athlete: User) => {
        setSelectedAthlete(athlete);
        setLoadingHistory(true);
        setHistoryDialogOpen(true);

        try {
            const history = await getAthleteSubscriptionHistory(athlete.id);
            setAthleteHistory(history);
        } catch (error) {
            console.error("Error loading history:", error);
            toast({
                title: "Error",
                description: "Failed to load subscription history.",
                variant: "destructive",
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handlePlanChange = (plan: SubscriptionPlan) => {
        setFormPlan(plan);
        if (plan !== "none" && formStartDate) {
            let endDate: Date;
            switch (plan) {
                case "monthly":
                    endDate = addMonths(formStartDate, 1);
                    break;
                case "quarterly":
                    endDate = addMonths(formStartDate, 3);
                    break;
                case "yearly":
                    endDate = addYears(formStartDate, 1);
                    break;
                default:
                    endDate = formStartDate;
            }
            setFormEndDate(endDate);
        }
    };

    const handleStartDateChange = (date: Date | undefined) => {
        setFormStartDate(date);
        if (formPlan !== "none" && date) {
            let endDate: Date;
            switch (formPlan) {
                case "monthly":
                    endDate = addMonths(date, 1);
                    break;
                case "quarterly":
                    endDate = addMonths(date, 3);
                    break;
                case "yearly":
                    endDate = addYears(date, 1);
                    break;
                default:
                    endDate = date;
            }
            setFormEndDate(endDate);
        }
    };

    const handleRegisterPayment = async () => {
        if (!athleteToActivate || !user || !formStartDate || !formEndDate) return;

        setUpdating(athleteToActivate.id);
        try {
            // Update user subscription
            await updateSubscription(
                athleteToActivate.id,
                "active",
                formPlan,
                formStartDate,
                formEndDate
            );

            // Create history entry
            await addSubscriptionHistory(
                athleteToActivate.id,
                formPlan,
                "active",
                formStartDate,
                formEndDate,
                user.uid,
                formPaymentAmount ? parseFloat(formPaymentAmount) : undefined,
                formPaymentMethod,
                formNotes
            );

            setAthletes((prev) =>
                prev.map((a) =>
                    a.id === athleteToActivate.id
                        ? {
                            ...a,
                            subscriptionStatus: "active",
                            subscriptionPlan: formPlan,
                            subscriptionStartDate: formStartDate,
                            subscriptionEndDate: formEndDate,
                        }
                        : a
                )
            );

            toast({
                title: "Payment Registered",
                description: `Subscription activated for ${athleteToActivate.displayName}.`,
            });
            setRegisterPaymentOpen(false);

        } catch (error) {
            console.error("Error registering payment:", error);
            toast({
                title: "Error",
                description: "Failed to register payment.",
                variant: "destructive",
            });
        } finally {
            setUpdating(null);
            setAthleteToActivate(null);
        }
    };

    const handleEditSubscription = async () => {
        if (!selectedAthlete || !user) return;

        setUpdating(selectedAthlete.id);
        try {
            await updateSubscription(
                selectedAthlete.id,
                formStatus,
                formPlan,
                formStartDate,
                formEndDate
            );

            // Add to history ONLY if payment amount provided, implying a payment fix/update
            if (formPaymentAmount) {
                await addSubscriptionHistory(
                    selectedAthlete.id,
                    formPlan,
                    formStatus,
                    formStartDate || new Date(),
                    formEndDate || new Date(),
                    user.uid,
                    parseFloat(formPaymentAmount),
                    "manual_update", // distinguish manual edits
                    `Manual update: ${formNotes}`
                );
            }

            // Update local state
            setAthletes((prev) =>
                prev.map((a) =>
                    a.id === selectedAthlete.id
                        ? {
                            ...a,
                            subscriptionStatus: formStatus,
                            subscriptionPlan: formPlan,
                            subscriptionStartDate: formStartDate,
                            subscriptionEndDate: formEndDate,
                        }
                        : a
                )
            );

            toast({
                title: "Subscription Updated",
                description: `${selectedAthlete.displayName}'s subscription has been updated.`,
            });
            setEditDialogOpen(false);
        } catch (error) {
            console.error("Error updating subscription:", error);
            toast({
                title: "Error",
                description: "Failed to update subscription.",
                variant: "destructive",
            });
        } finally {
            setUpdating(null);
        }
    };

    const openDeactivateDialog = (athlete: User) => {
        setAthleteToDeactivate(athlete);
        setDeactivateDialogOpen(true);
    };

    const handleDeactivateConfirm = async () => {
        if (athleteToDeactivate) {
            await deactivateSubscription(athleteToDeactivate);
            setDeactivateDialogOpen(false);
            setAthleteToDeactivate(null);
        }
    };

    const deactivateSubscription = async (athlete: User) => {
        setUpdating(athlete.id);
        try {
            await updateSubscription(athlete.id, "inactive", "none");

            setAthletes((prev) =>
                prev.map((a) =>
                    a.id === athlete.id
                        ? {
                            ...a,
                            subscriptionStatus: "inactive",
                            subscriptionPlan: "none",
                            subscriptionStartDate: undefined,
                            subscriptionEndDate: undefined,
                        }
                        : a
                )
            );

            toast({
                title: "Subscription Deactivated",
                description: `${athlete.displayName}'s subscription has been deactivated.`,
            });
        } catch (error) {
            console.error("Error deactivating subscription:", error);
            toast({
                title: "Error",
                description: "Failed to deactivate subscription.",
                variant: "destructive",
            });
        } finally {
            setUpdating(null);
        }
    };

    const openHistoryEditDialog = (entry: SubscriptionHistoryEntry) => {
        setHistoryEntryToEdit(entry);
        setHistoryEditPaymentAmount(entry.paymentAmount ? entry.paymentAmount.toString() : "");
        setHistoryEditPaymentMethod(entry.paymentMethod || "cash");
        setHistoryEditNotes(entry.notes || "");
        setHistoryEditDate(entry.createdAt || new Date());
        setEditHistoryDialogOpen(true);
    };

    const handleUpdateHistoryEntry = async () => {
        if (!historyEntryToEdit) return;

        setLoadingHistory(true);
        try {
            await updateSubscriptionHistoryEntry(historyEntryToEdit.id, {
                paymentAmount: historyEditPaymentAmount ? parseFloat(historyEditPaymentAmount) : undefined,
                paymentMethod: historyEditPaymentMethod,
                notes: historyEditNotes,
                createdAt: historyEditDate // allow editing date if needed
            });

            // Update local state
            setAthleteHistory(prev => prev.map(entry =>
                entry.id === historyEntryToEdit.id ? {
                    ...entry,
                    paymentAmount: historyEditPaymentAmount ? parseFloat(historyEditPaymentAmount) : undefined,
                    paymentMethod: historyEditPaymentMethod,
                    notes: historyEditNotes,
                    createdAt: historyEditDate || entry.createdAt
                } : entry
            ));

            toast({
                title: "Entry Updated",
                description: "Payment record updated successfully.",
            });
            setEditHistoryDialogOpen(false);
        } catch (error) {
            console.error("Error updating history:", error);
            toast({
                title: "Error",
                description: "Failed to update record.",
                variant: "destructive",
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeleteHistoryEntry = async (entryId: string) => {
        if (!confirm("Are you sure you want to delete this payment record?")) return;

        setLoadingHistory(true);
        try {
            await deleteSubscriptionHistoryEntry(entryId);
            setAthleteHistory(prev => prev.filter(entry => entry.id !== entryId));
            toast({
                title: "Entry Deleted",
                description: "Payment record deleted.",
            });
        } catch (error) {
            console.error("Error deleting history:", error);
            toast({
                title: "Error",
                description: "Failed to delete record.",
                variant: "destructive",
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    // Calculate total history amount
    const totalHistoryAmount = useMemo(() => {
        return athleteHistory.reduce((sum, entry) => sum + (entry.paymentAmount || 0), 0);
    }, [athleteHistory]);

    return (
        <AdminLayout>
            <div className="p-4 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">Subscriptions</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage athlete subscription status and plans
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Athletes
                            </CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Registered athletes
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Active Subscriptions
                            </CardTitle>
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                <p className="text-xs text-emerald-600 font-medium">
                                    {stats.activeRate}% active rate
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Trial Period
                            </CardTitle>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-2xl font-bold text-amber-600">{stats.trial}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                In trial period
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Inactive / Expired
                            </CardTitle>
                            <UserX className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-2xl font-bold text-red-600">
                                {stats.inactive + stats.expired}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Needs attention
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Plan Distribution */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Active Plan Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Visual Bar Chart */}
                            <div className="flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">Monthly</span>
                                            <span className="text-muted-foreground">{planStats.monthly} athletes</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${stats.active > 0 ? (planStats.monthly / stats.active) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">Quarterly</span>
                                            <span className="text-muted-foreground">{planStats.quarterly} athletes</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${stats.active > 0 ? (planStats.quarterly / stats.active) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">Yearly</span>
                                            <span className="text-muted-foreground">{planStats.yearly} athletes</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${stats.active > 0 ? (planStats.yearly / stats.active) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Circular Stats */}
                            <div className="flex items-center justify-center md:w-48">
                                <div className="relative w-32 h-32">
                                    <svg className="w-32 h-32 transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="none"
                                            className="text-muted"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="url(#gradient)"
                                            strokeWidth="12"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeDasharray={`${stats.activeRate * 3.52} 352`}
                                            className="transition-all duration-700"
                                        />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="hsl(var(--primary))" />
                                                <stop offset="100%" stopColor="hsl(25, 95%, 53%)" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold">{stats.activeRate}%</span>
                                        <span className="text-xs text-muted-foreground">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Athletes Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : athletes.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No athletes registered yet.</p>
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Athlete Subscriptions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[150px]">Athlete</TableHead>
                                            <TableHead className="min-w-[100px]">Status</TableHead>
                                            <TableHead className="min-w-[100px]">Plan</TableHead>
                                            <TableHead className="min-w-[120px]">Start Date</TableHead>
                                            <TableHead className="min-w-[120px]">End Date</TableHead>
                                            <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {athletes.map((athlete) => {
                                            const StatusIcon = statusConfig[athlete.subscriptionStatus].icon;
                                            return (
                                                <TableRow key={athlete.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{athlete.displayName}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {athlete.email}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={`${statusConfig[athlete.subscriptionStatus].color} border flex items-center gap-1 w-fit`}
                                                        >
                                                            <StatusIcon className="h-3 w-3" />
                                                            {statusConfig[athlete.subscriptionStatus].label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {planConfig[athlete.subscriptionPlan].label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-muted-foreground">
                                                            {athlete.subscriptionStartDate
                                                                ? format(athlete.subscriptionStartDate, "MMM d, yyyy")
                                                                : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-muted-foreground">
                                                            {athlete.subscriptionEndDate
                                                                ? format(athlete.subscriptionEndDate, "MMM d, yyyy")
                                                                : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                {athlete.subscriptionStatus !== "active" && (
                                                                    <DropdownMenuItem onClick={() => openRegisterPaymentDialog(athlete)}>
                                                                        <DollarSign className="mr-2 h-4 w-4" />
                                                                        <span>Register Payment</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {athlete.subscriptionStatus === "active" && (
                                                                    <DropdownMenuItem onClick={() => openRegisterPaymentDialog(athlete)}>
                                                                        <Plus className="mr-2 h-4 w-4" />
                                                                        <span>Renew / Add Payment</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => openHistoryDialog(athlete)}>
                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                    <span>View History</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openEditDialog(athlete)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    <span>Edit Details</span>
                                                                </DropdownMenuItem>
                                                                {athlete.subscriptionStatus === "active" && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onClick={() => openDeactivateDialog(athlete)}
                                                                            className="text-red-600 focus:text-red-600"
                                                                        >
                                                                            <XCircle className="mr-2 h-4 w-4" />
                                                                            <span>Deactivate</span>
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Edit Subscription Dialog (Super Admin / Manual) */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Edit Subscription Details</DialogTitle>
                            <DialogDescription>
                                Manually update details for {selectedAthlete?.displayName}. Use "Register Payment" for payments.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formStatus}
                                    onValueChange={(value) => setFormStatus(value as SubscriptionStatus)}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                        <SelectItem value="trial">Trial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="plan">Plan</Label>
                                <Select
                                    value={formPlan}
                                    onValueChange={(value) => handlePlanChange(value as SubscriptionPlan)}
                                >
                                    <SelectTrigger id="plan">
                                        <SelectValue placeholder="Select plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                        <SelectItem value="none">No Plan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* ... (Kept existing form fields for dates/payment - optional manual edit) ... */}
                            <div className="grid gap-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formStartDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formStartDate ? format(formStartDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formStartDate}
                                            onSelect={handleStartDateChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label>End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formEndDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formEndDate ? format(formEndDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formEndDate}
                                            onSelect={setFormEndDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleEditSubscription} disabled={updating !== null}>
                                {updating ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Register Payment Dialog (New Flow) */}
                <Dialog open={registerPaymentOpen} onOpenChange={setRegisterPaymentOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Register Payment & Subscription</DialogTitle>
                            <DialogDescription>
                                Activate subscription and record payment for {athleteToActivate?.displayName}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="pay-plan">Subscription Plan</Label>
                                    <Select
                                        value={formPlan}
                                        onValueChange={(value) => handlePlanChange(value as SubscriptionPlan)}
                                    >
                                        <SelectTrigger id="pay-plan">
                                            <SelectValue placeholder="Select plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="pay-amount">Amount Paid (€)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="pay-amount"
                                            type="number"
                                            className="pl-9"
                                            placeholder="0.00"
                                            value={formPaymentAmount}
                                            onChange={(e) => setFormPaymentAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formStartDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formStartDate ? format(formStartDate, "PPP") : "Date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formStartDate}
                                                onSelect={handleStartDateChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formEndDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formEndDate ? format(formEndDate, "PPP") : "Date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formEndDate}
                                                onSelect={setFormEndDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="pay-method">Payment Method</Label>
                                <Select
                                    value={formPaymentMethod}
                                    onValueChange={setFormPaymentMethod}
                                >
                                    <SelectTrigger id="pay-method">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="card">Credit Card</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="pay-notes">Notes / Receipt Ref</Label>
                                <Textarea
                                    id="pay-notes"
                                    placeholder="Optional notes about the payment..."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setRegisterPaymentOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleRegisterPayment} disabled={updating !== null}>
                                {updating ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Confirm Payment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Subscription History Report Dialog */}
                <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                    <DialogContent className="sm:max-w-[800px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Payment Report: {selectedAthlete?.displayName}
                            </DialogTitle>
                            <DialogDescription>
                                History of all subscription payments and activations.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Summary Header */}
                        <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between border">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                                <p className="text-2xl font-bold">€{totalHistoryAmount.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-muted-foreground">Last Payment</p>
                                <p className="font-medium">
                                    {athleteHistory.length > 0
                                        ? format(athleteHistory[0].createdAt, "MMM d, yyyy")
                                        : "N/A"}
                                </p>
                            </div>
                        </div>

                        <div className="py-4">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : athleteHistory.length === 0 ? (
                                <div className="text-center py-16 border rounded-lg border-dashed">
                                    <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground">No payment history recorded.</p>
                                </div>
                            ) : (
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Period</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {athleteHistory.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {format(entry.createdAt, "MMM d, yyyy")}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(entry.createdAt, "h:mm a")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize">
                                                            {entry.plan}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-emerald-600">
                                                        {entry.paymentAmount ? `€${entry.paymentAmount.toFixed(2)}` : "-"}
                                                    </TableCell>
                                                    <TableCell className="capitalize text-muted-foreground">
                                                        {entry.paymentMethod?.replace('_', ' ') || "Manual"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {format(entry.startDate, "MMM d")} - {format(entry.endDate, "MMM d, yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => openHistoryEditDialog(entry)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                                onClick={() => handleDeleteHistoryEntry(entry.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
                                Close Report
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit History Entry Dialog */}
                <Dialog open={editHistoryDialogOpen} onOpenChange={setEditHistoryDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Edit Payment Record</DialogTitle>
                            <DialogDescription>
                                Update payment details.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-amount">Amount (€)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="edit-amount"
                                            type="number"
                                            className="pl-9"
                                            value={historyEditPaymentAmount}
                                            onChange={(e) => setHistoryEditPaymentAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-method">Method</Label>
                                    <Select
                                        value={historyEditPaymentMethod}
                                        onValueChange={setHistoryEditPaymentMethod}
                                    >
                                        <SelectTrigger id="edit-method">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="card">Credit Card</SelectItem>
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-date">Payment Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !historyEditDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {historyEditDate ? format(historyEditDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={historyEditDate}
                                            onSelect={setHistoryEditDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-notes">Notes</Label>
                                <Textarea
                                    id="edit-notes"
                                    value={historyEditNotes}
                                    onChange={(e) => setHistoryEditNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setEditHistoryDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateHistoryEntry} disabled={loadingHistory}>
                                {loadingHistory ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Deactivate User Confirmation Dialog (Global for cleanliness) */}
                <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate Subscription</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to deactivate {athleteToDeactivate?.displayName}'s
                                subscription? They will lose access to premium features.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeactivateConfirm}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Deactivate
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
};

export default AdminSubscriptions;
