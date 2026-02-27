"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOpportunity, updateOpportunity } from "@/app/actions/crm/opportunity.action";
import { getContacts } from "@/app/actions/crm/contact.action";
import { toast } from "sonner";
import { useEffect, useState, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  clientId: z.string().min(1, "Client is required"),
  contactId: z.string().min(1, "Contact is required"),
  value: z.number().min(0, "Value must be a positive number"),
  expectedCloseDate: z.string().min(1, "Expected close date is required"),
  ownerId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OpportunityFormProps {
  clients: { id: string; name: string }[];
  users?: { id: string; name: string | null; email: string }[];
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export default function OpportunityForm({
  clients,
  users = [],
  onSuccess,
  onCancel,
  initialData
}: OpportunityFormProps) {
  const [isPending, startTransition] = useTransition();
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      clientId: initialData?.clientId || "",
      contactId: initialData?.contactId || "",
      value: initialData?.value ? Number(initialData.value) : 0,
      expectedCloseDate: initialData?.expectedCloseDate 
        ? new Date(initialData.expectedCloseDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      ownerId: initialData?.ownerId || (users.length > 0 ? users[0]?.id : ""),
    },
  });

  const selectedClientId = form.watch("clientId");
  const previousClientIdRef = useRef(initialData?.clientId || "");

  useEffect(() => {
    async function fetchContacts() {
      if (!selectedClientId) {
        setContacts([]);
        return;
      }
      
      setLoadingContacts(true);
      
      // Only reset contact if client actually changed from previous value
      if (selectedClientId !== previousClientIdRef.current) {
         form.setValue("contactId", "");
      }
      previousClientIdRef.current = selectedClientId;
      
      try {
        const result = await getContacts(selectedClientId);
        if (result.success) {
          setContacts(result.contacts || []);
        } else {
          toast.error("Failed to load contacts for selected client");
        }
      } catch (error) {
        toast.error("Error loading contacts");
      } finally {
        setLoadingContacts(false);
      }
    }

    fetchContacts();
  }, [selectedClientId, form]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const data = {
          ...values,
          expectedCloseDate: new Date(values.expectedCloseDate),
        };
        
        let result;
        if (isEditing) {
            result = await updateOpportunity(initialData.id, data);
        } else {
            result = await createOpportunity(data);
        }

        if (result.success) {
          const action = isEditing ? "updated" : "created";
          console.log(`Opportunity ${action} successfully:`, result);
          toast.success(`Opportunity ${action} successfully`);
          onSuccess();
        } else {
          console.error("Failed to save opportunity:", result.error);
          toast.error(result.error || "Failed to save opportunity");
        }
      } catch (error) {
        toast.error("An error occurred");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opportunity Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Q3 Software License Deal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                       <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Contact</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  // Allow interaction if editing and contacts loaded, or if new and client selected
                  disabled={(!selectedClientId && !isEditing) || loadingContacts || (contacts.length === 0 && !loadingContacts)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !selectedClientId ? "Select Client First" : 
                        loadingContacts ? "Loading..." : 
                        contacts.length === 0 ? "No Contacts Found" : 
                        "Select Contact"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedCloseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Close Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

           <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Assignee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                         <div className="flex items-center gap-2">
                           <span className="truncate">{user.name || user.email}</span>
                         </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Opportunity" : "Create Opportunity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
