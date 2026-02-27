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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createContact, updateContact } from "@/app/actions/crm/contact.action";
import { toast } from "sonner";
import { useState, useTransition, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { FiSearch } from "react-icons/fi";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  designation: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
  isPrimary: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContactFormProps {
  clients: { id: string; name: string }[];
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ContactForm({
  clients,
  initialData,
  onSuccess,
  onCancel,
}: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [clientSearch, setClientSearch] = useState("");

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const lowerSearch = clientSearch.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(lowerSearch)
    );
  }, [clients, clientSearch]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      designation: initialData?.designation || "",
      clientId: initialData?.clientId || "",
      isPrimary: initialData?.isPrimary || false,
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (initialData) {
          const result = await updateContact(initialData.id, values);
          if (result.success) {
            toast.success("Contact updated successfully");
            onSuccess();
          } else {
            toast.error(result.error || "Failed to update contact");
          }
        } else {
          const result = await createContact(values);
          if (result.success) {
            toast.success("Contact created successfully");
            onSuccess();
          } else {
            toast.error(result.error || "Failed to create contact");
          }
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 234 567 890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client (Company)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData?.clientId}>
                <FormControl>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                    <div className="relative">
                      <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                      <Input
                        placeholder="Search clients..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="h-8 text-xs pl-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No clients found
                    </div>
                  ) : (
                    filteredClients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-sm">
                            {client.name}
                          </span>
                          {client.clientCode && (
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {client.clientCode}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation</FormLabel>
              <FormControl>
                <Input placeholder="manager" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPrimary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Primary Contact</FormLabel>
                <FormDescription>
                  Mark this contact as the primary point of communication.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Contact" : "Create Contact"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
