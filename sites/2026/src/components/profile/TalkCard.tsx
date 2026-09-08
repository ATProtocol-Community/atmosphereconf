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
    <div className="group/card border-border bg-card hover:border-primary/30 hover:bg-primary/5 relative isolate block rounded-lg border px-5 py-3 transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-primary/40 group-hover/card:text-primary shrink-0 transition-colors">
          &rarr;
        </span>
        <div className="min-w-0 flex-1">
          <a href={`/event/${talk.id}`}>
            <span
              className={`text-card-foreground line-clamp-2 h-10 leading-5 font-semibold ${titleSize}`}
              dangerouslySetInnerHTML={{ __html: talk.title }}
            />
            <span className="absolute inset-0 z-10 h-full w-full" />
          </a>
          <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
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
                      className="text-primary z-20 cursor-pointer hover:underline"
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
