-- SAMPLE ONLY: ten original demonstration questions, not an approved content bank.
begin;
insert into public.topics(id,code,title,year,strand_id,sort)
values('f0000000-0000-4000-8000-000000000001','P5-FRACTIONS-SAMPLE','Fractions (sample)',5,'number',1);
do $$ declare n integer; item uuid; begin
 for n in 1..10 loop
  item := ('f1000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid;
  insert into public.items(id,topic_id,current_version,status) values(item,'f0000000-0000-4000-8000-000000000001',1,'published');
  insert into public.item_versions(item_id,version,type,stem,options,explanation,hint,difficulty,tags,media,curriculum_edition,provenance,author_id,reviewer_id,answer_verified_at,status,published_at)
  values(item,1,'single_choice',format('[Sample] What is %s/12 + 1/12? Choose the sum written in twelfths.',n),
   jsonb_build_array(jsonb_build_object('id','a','text',(n+1)||'/12'),jsonb_build_object('id','b','text',(n+2)||'/12'),jsonb_build_object('id','c','text',n||'/12'),jsonb_build_object('id','d','text',(n+12)||'/12')),
   format('[Sample] The denominators are equal, so add the numerators: %s + 1 = %s. The sum is %s/12.',n,n+1,n+1),
   'When the denominators match, keep the denominator and add the numerators.',
   (array['easy','standard','hard'])[1+(n%3)],array['sample'],'[]','revised_2025','original',
   'eeeeeeee-0000-4000-8000-000000000002','eeeeeeee-0000-4000-8000-000000000003','2026-11-17T00:00:00Z','published',now());
  insert into public.item_answers values(item,1,'{"option_id":"a"}');
 end loop;
end $$;
commit;
