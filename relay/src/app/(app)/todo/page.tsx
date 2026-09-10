'use client';

import { WeeklyTodoList } from '@/components/todos/weekly-todo-list';
import { NotesWorkspace } from '@/components/notes/notes-workspace';
import { PageHeader } from '@/components/ui/page-header';

export default function TodoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="max-w-3xl">
        <PageHeader title="To Do" subtitle="Your week, one day at a time." />
        <div className="mt-6"><WeeklyTodoList /></div>
      </div>
      <div className="mt-12 border-t border-border pt-9"><NotesWorkspace /></div>
    </div>
  );
}
