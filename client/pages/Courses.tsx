import { useMemo } from "react";
import TopNavbar from "@/components/TopNavbar";
import { Button } from "@/components/ui/button";
import { DHYAN_COURSES } from "@shared/payments";

export default function Courses() {
  const courses = useMemo(() => DHYAN_COURSES, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19]">
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

        <div className="mt-6 rounded-xl border border-emerald-200/70 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">
          It will be available soon
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {courses.map((course) => {
            return (
              <article
                key={course.id}
                className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-[#101624]/90 shadow-lg shadow-emerald-500/5 overflow-hidden"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-[#0B0F19]">
                  <img
                    src={course.imageUrl || "/Banner.jpeg"}
                    alt={course.name}
                    className="h-full w-full object-cover"
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
                    <span className="inline-flex items-center rounded-full bg-slate-900/5 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Available soon
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                        Status
                      </p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                        Coming soon
                      </p>
                    </div>
                    <Button
                      disabled
                      className="w-full sm:w-auto rounded-xl px-5 py-6 text-sm font-semibold"
                    >
                      It will be available soon
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
