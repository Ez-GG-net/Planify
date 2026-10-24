import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Calendar, Pencil, Plus, SquarePen, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SchedulePlan } from "@planify/types"
import { useSchedules } from "@/components/schedule/schedule-context"
import { UserButton } from "@/components/auth/user-button"

export function AppSidebar({
  onCreateSchedule,
  revealed,
  onMouseLeave,
}: {
  onCreateSchedule: () => void
  revealed: boolean
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}) {
  const router = useRouter()
  const pathname = usePathname()

  const { isMobile, setOpenMobile } = useSidebar()
  const { schedules, updateSchedule, removeSchedule } = useSchedules()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const activeId = pathname.match(/^\/view\/schedule\/([^/]+)/)?.[1]

  function go(path: string) {
    if (isMobile) setOpenMobile(false)
    router.push(path)
  }

  /*
   * One context write per action: the provider updates its list and persists,
   * so a rename shows up on the open plan view instantly and a delete is
   * gone everywhere at once (no stale second write resurrecting it).
   */
  function handleRename(id: string) {
    const trimmed = editValue.trim()
    const schedule = schedules.find((s) => s.id === id)

    if (!trimmed || !schedule) return

    void updateSchedule({ ...schedule, title: trimmed })
    setEditingId(null)
    setEditValue("")
  }

  function handleDelete(id: string) {
    void removeSchedule(id)
    if (activeId === id) {
      go("/view/schedules/")
    }
  }

  function startRename(schedule: SchedulePlan) {
    setEditingId(schedule.id)
    setEditValue(schedule.title)
  }

  return (
    <Sidebar
      onMouseLeave={onMouseLeave}
      className={cn(revealed && "shadow-2xl")}
    >
      <SidebarHeader>
        <Link
          href="/"
          aria-label="Planify home"
          className="flex items-center gap-2 px-2 py-1.5"
        >
          <Image src="/logo.png" alt="Logo" width={28} height={28} />
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            Planify
          </span>
        </Link>
        <SidebarSeparator />
        <Button
          variant="ghost"
          size="default"
          className="w-full justify-start gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={onCreateSchedule}
        >
          <SquarePen className="size-5" />
          Create schedule
        </Button>
        <Button
          variant="ghost"
          size="default"
          className="w-full justify-start gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => go("/view/schedules/")}
        >
          <Calendar className="size-5" />
          View timeline
        </Button>
        <SidebarSeparator />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent schedules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {schedules.map((schedule) => (
                <SidebarMenuItem key={schedule.id}>
                  <ContextMenu>
                    <ContextMenuTrigger
                      className={cn(
                        "rounded-md border",
                        activeId === schedule.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "border-transparent"
                      )}
                    >
                      {editingId === schedule.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            handleRename(schedule.id)
                          }}
                          className="flex h-8 items-center"
                        >
                          <Input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => setEditingId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingId(null)
                            }}
                          />
                        </form>
                      ) : (
                        <SidebarMenuButton
                          className="w-full"
                          onClick={() => go(`/view/schedule/${schedule.id}`)}
                        >
                          <span className="truncate">{schedule.title}</span>
                        </SidebarMenuButton>
                      )}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => startRename(schedule)}>
                        <Pencil className="size-4" />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserButton callbackPath={pathname}/>
      </SidebarFooter>
    </Sidebar>
  )
}
