import { useMemo } from "react";
import TopNavbar from "@/components/TopNavbar";
import { Button } from "@/components/ui/button";
import { DHYAN_COURSES } from "@shared/payments";

export default function Courses() {
  const courses = useMemo(() => DHYAN_COURSES, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <TopNavbar />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-500 font-semibold">
            Courses
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-slate-900 dark:text-white">
            Dhyan Learning Tracks
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Deepen your meditation journey with guided courses, daily structure, and
            progress checkpoints.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {courses.map((course) => {
            return (
              <article
                key={course.id}
                className="rounded-2xl border border-slate-200/70 dark:border-border bg-white/90 dark:bg-card/90 shadow-lg shadow-emerald-500/5 overflow-hidden cursor-pointer group"
                onClick={() =>
                  window.open(
                    "https://www.parmaracademy.in/courses/75-safar-30",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-muted">
                  <img
                    src={course.imageUrl || "/Banner.jpeg"}
                    alt={course.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {course.name}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {course.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      Available
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                        Status
                      </p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                        Available
                      </p>
                    </div>
                    <Button
                      className="w-full sm:w-auto rounded-xl px-5 py-6 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          "https://www.parmaracademy.in/courses/75-safar-30",
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      Buy now
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
