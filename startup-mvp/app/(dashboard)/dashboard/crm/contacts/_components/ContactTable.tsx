"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { FiMoreVertical, FiEdit, FiTrash2, FiMail, FiPhone } from "react-icons/fi";
import { deleteContact } from "@/app/actions/crm/contact.action";
import { toast } from "sonner";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  clientId: string;
  client?: { name: string; company: string | null };
  isPrimary?: boolean; // Optional in case not fetched
}

interface ContactTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onRefresh: () => void;
  hideClientColumn?: boolean;
}

export default function ContactTable({ contacts, onEdit, onRefresh, hideClientColumn }: ContactTableProps) {
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const result = await deleteContact(deleteId);
            if (result.success) {
                toast.success("Contact deleted successfully");
                onRefresh();
            } else {
                toast.error(result.error || "Failed to delete contact");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setDeleteId(null);
        }
    };

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Designation</TableHead>
            {!hideClientColumn && <TableHead>Client</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={hideClientColumn ? 4 : 5} className="h-24 text-center">
                No contacts found.
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/crm/contacts/${contact.id}`} className="hover:underline">
                        {contact.name}
                    </Link>
                    {contact.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm text-muted-foreground gap-1">
                    {contact.email && (
                        <div className="flex items-center gap-1">
                            <FiMail className="h-3 w-3" /> {contact.email}
                        </div>
                    )}
                    {contact.phone && (
                        <div className="flex items-center gap-1">
                            <FiPhone className="h-3 w-3" /> {contact.phone}
                        </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{contact.designation || "-"}</TableCell>
                {!hideClientColumn && (
                    <TableCell>
                        {contact.client?.name || contact.client?.company || "-"}
                    </TableCell>
                )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <FiMoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(contact)}>
                        <FiEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(contact.id)}>
                        <FiTrash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the contact.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
