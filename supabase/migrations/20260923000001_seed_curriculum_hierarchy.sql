insert into public.curriculum_school_levels (slug, title, sort_order)
values
  ('high', '고등', 1),
  ('middle', '중등', 2);

insert into public.curriculum_tracks (school_level_id, slug, title, sort_order)
select
  curriculum_school_levels.id,
  track_data.track_slug,
  track_data.track_title,
  track_data.track_sort
from public.curriculum_school_levels
cross join (
  values
    ('high', 'prep', '예비 고등', 1),
    ('high', 'exam', '고등 내신', 2)
) as track_data(level_slug, track_slug, track_title, track_sort)
where curriculum_school_levels.slug = track_data.level_slug;

update public.curriculum_categories
set track_id = (
  select curriculum_tracks.id
  from public.curriculum_tracks
  join public.curriculum_school_levels
    on curriculum_school_levels.id = curriculum_tracks.school_level_id
  where curriculum_school_levels.slug = 'high'
    and curriculum_tracks.slug = 'exam'
)
where curriculum_categories.slug = 'exam-8week';

update public.curriculum_categories
set track_id = (
  select curriculum_tracks.id
  from public.curriculum_tracks
  join public.curriculum_school_levels
    on curriculum_school_levels.id = curriculum_tracks.school_level_id
  where curriculum_school_levels.slug = 'high'
    and curriculum_tracks.slug = 'prep'
)
where curriculum_categories.slug in (
  'syntax-vocab-dec-jan',
  'reading-grammar-jan-feb',
  'exam-prep-feb-mar'
);
