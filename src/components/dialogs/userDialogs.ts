// Dialogs about users (ports of the AngularJS SisDialogs).

import { openDialog } from "@/dialogs";
import type { User } from "@/lib/api/types";
import UserEditDialog from "./UserEditDialog.vue";
import UserGroupDialog from "./UserGroupDialog.vue";

export async function showUsersInGroup(group: string): Promise<void> {
    await openDialog(UserGroupDialog, { title: "Users belonging to " + group, query: { ["roles." + group]: { $exists: true } } });
}

export async function showSuperUsers(): Promise<void> {
    await openDialog(UserGroupDialog, { title: "Super Users", query: { super_user: true } });
}

// resolves with the saved user, or undefined when cancelled
export function editUser(user: User): Promise<User | undefined> {
    return openDialog<User>(UserEditDialog, { user });
}
