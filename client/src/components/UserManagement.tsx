import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Trash2, ShieldAlert, ChevronDown } from "lucide-react";

export default function UserManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"viewer" | "admin" | "super_admin">("viewer");

  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.users.getAll.useQuery();
  const { data: currentUser } = trpc.auth.getMe.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      setIsOpen(false);
      setEmail("");
      setName("");
      setPassword("");
      setRole("viewer");
      toast.success("User created successfully");
    },
    onError: (err) => toast.error(`Error creating user: ${err.message}`),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      toast.success("User deleted");
    },
    onError: (err) => toast.error(`Error deleting user: ${err.message}`),
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <p className="text-[11px] text-slate-500">Add or remove users and manage their access roles.</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-50 text-[11px] hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-sm font-medium px-4 h-7 shadow-xs">
              + Create new user
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl border-slate-100 p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Create internal user</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ email, name, password, role }); }} className="space-y-4 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-10 rounded-md border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 rounded-md border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Password (min 6 chars)</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-10 rounded-md border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Role</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10 px-3 text-sm rounded-md border-slate-200 bg-white font-normal text-slate-700">
                      <span>
                        {role === 'super_admin' ? 'Super Admin (Full access)' :
                          role === 'admin' ? 'Admin (Can edit properties & links)' :
                            'Viewer (Read-only)'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 rounded-md border-slate-100 p-1 shadow-md">
                    <DropdownMenuItem onClick={() => setRole('viewer')} className="text-xs rounded-sm cursor-pointer">
                      Viewer (Read-only)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRole('admin')} className="text-xs rounded-sm cursor-pointer">
                      Admin (Can edit properties & links)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRole('super_admin')} className="text-xs rounded-sm cursor-pointer">
                      Super Admin (Full access)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md h-10 mt-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              <TableHead className="h-10 text-xs font-semibold text-slate-500">Name</TableHead>
              <TableHead className="h-10 text-xs font-semibold text-slate-500">Email</TableHead>
              <TableHead className="h-10 text-xs font-semibold text-slate-500">Role</TableHead>
              <TableHead className="h-10 text-xs font-semibold text-slate-500">Last Active</TableHead>
              <TableHead className="h-10 text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => (
              <TableRow key={u.id} className="hover:bg-slate-50/50">
                <TableCell className="font-semibold text-slate-700 text-xs py-3">{u.name || "N/A"}</TableCell>
                <TableCell className="text-slate-600 text-xs py-3">{u.email}</TableCell>
                <TableCell className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${u.role === 'super_admin' ? 'bg-red-50 text-red-700 border border-red-100' :
                    u.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                    {u.role.replace('_', ' ').toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-slate-400 text-xs py-3">
                  {/* @ts-ignore */}
                  {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell className="text-right py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0 rounded-md"
                    disabled={u.id === currentUser?.id || deleteMutation.isPending}
                    onClick={() => setDeleteUserId(u.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent className="rounded-xl border-slate-100 p-5 m-2 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Delete user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete this user? This action cannot be undone and they will lose access immediately.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-8 text-xs rounded-sm px-3 text-slate-600 hover:bg-slate-50" onClick={() => setDeleteUserId(null)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white px-4 rounded-sm" onClick={() => {
                if (deleteUserId) {
                  deleteMutation.mutate({ id: deleteUserId });
                  setDeleteUserId(null);
                }
              }}>
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
