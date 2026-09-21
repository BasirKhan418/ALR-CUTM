export function RoleHome({
  title,
  purpose,
}: {
  title: string
  purpose: string
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <h1 className="font-heading text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{purpose}</p>
    </div>
  )
}
