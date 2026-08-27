"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTeamAction } from "./teams-actions";

export function NewTeamDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-4" />
        New team
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            You can assign members and pick a lead once it&rsquo;s created.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          action={async (formData) => {
            await createTeamAction(formData);
            setOpen(false);
            formRef.current?.reset();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Team name</Label>
            <Input id="name" name="name" required placeholder="Customer Success" />
          </div>
          <DialogFooter>
            <Button type="submit">Create team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
