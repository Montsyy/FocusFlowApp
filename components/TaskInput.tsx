export function TaskInput() {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="task-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Tambah Tugas Baru
      </label>
      <input
        id="task-input"
        type="text"
        placeholder="Tulis tugas dalam bahasa alami..."
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  )
}
