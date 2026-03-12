interface Speaker {
  name: string;
  id?: string;
}

export interface Talk {
  id: string;
  title: string;
  speakers?: Speaker[];
  typeName: string;
}

const badgeColors: Record<string, string> = {
  Presentation: "bg-blue-100 text-blue-700",
  "Lightning Talk": "bg-amber-100 text-amber-700",
  "Discussion / Panel": "bg-purple-100 text-purple-700",
  Workshop: "bg-emerald-100 text-emerald-700",
};

export function TalkCard({ talk }: { talk: Talk }) {
  const plainTitle = talk.title.replace(/<[^>]*>/g, "");
  const titleSize = plainTitle.length > 50 ? "text-sm" : "text-base";

  return (
    <div className="group/card relative isolate block rounded-lg border border-border bg-card px-5 py-3 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-primary/40 shrink-0 transition-colors group-hover/card:text-primary">
          &rarr;
        </span>
        <div className="min-w-0 flex-1">
          <a href={`/event/${talk.id}`}>
            <span
              className={`line-clamp-2 h-10 leading-5 font-semibold text-card-foreground ${titleSize}`}
              dangerouslySetInnerHTML={{ __html: talk.title }}
            />
            <span className="absolute inset-0 z-10 h-full w-full" />
          </a>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${badgeColors[talk.typeName] || "bg-secondary text-secondary-foreground"}`}
            >
              {talk.typeName}
            </span>
            {talk.speakers?.map((s, i) => (
              <span key={s.id ?? s.name}>
                {i > 0 && ", "}
                {s.name}
                {s.id && (
                  <>
                    {" · "}
                    <a
                      className="z-20 cursor-pointer text-primary hover:underline"
                      href={`/profile/${s.id}`}
                    >
                      @{s.id}
                    </a>
                  </>
                )}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
