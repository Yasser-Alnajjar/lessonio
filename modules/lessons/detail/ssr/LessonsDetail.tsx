import { Actions } from "@/actions";
import { LessonsDetailView } from "../csr/LessonsDetailView";

interface LessonsDetailProps {
  params: Promise<{ lessonId: string }>;
}

export const LessonsDetail = async ({ params }: LessonsDetailProps) => {
  const { lessonId } = await params;

  const [
    { data: lesson },
    { data: subjects },
    { data: tags },
    { data: notes },
    { data: attachments },
    { data: flashcards },
  ] = await Promise.all([
    Actions.Lessons.getById(lessonId),
    Actions.Subjects.getAll(),
    Actions.Tags.getAll(),
    Actions.Notes.getAllForLesson(lessonId),
    Actions.Attachments.getAllForLesson(lessonId),
    Actions.Flashcards.getByLesson(lessonId),
  ]);

  return (
    <LessonsDetailView
      data={lesson}
      lessonId={lessonId}
      subjects={subjects ?? []}
      tags={tags ?? []}
      notes={notes ?? []}
      attachments={attachments ?? []}
      flashcards={flashcards ?? []}
    />
  );
};
