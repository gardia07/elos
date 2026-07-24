CREATE TYPE "agenda_item_tipo" AS ENUM ('REUNIAO', 'PRAZO', 'TAREFA', 'PESSOAL');

ALTER TABLE "agenda_items" ADD COLUMN "tipo" "agenda_item_tipo" NOT NULL DEFAULT 'TAREFA';
