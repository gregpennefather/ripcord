import { Injectable } from '@nestjs/common';
import { Video } from './video.model';
import * as Loki from 'lokijs';
import { map, Observable, ReplaySubject, take } from 'rxjs';

@Injectable()
export class DataService {
  videos$: ReplaySubject<Collection<Video>> = new ReplaySubject();
  db: Loki;
  videosCollection: Collection<Video>;
  constructor() {
    const adapter = new Loki.LokiFsAdapter();
    this.db = new Loki('ripcord.db', {
      adapter,
      autoload: true,
      autoloadCallback: () => this.databaseInit(),
      autosave: true,
      autosaveInterval: 4000,
    });
  }

  videos(): Observable<Collection<Video>> {
    return this.videos$.asObservable();
  }

  findVideo(fileName: string): Observable<Video | null> {
    return this.videos$.pipe(
      take(1),
      map((c) => c.findOne({ fileName })),
    );
  }

  insertVideo(video: Video): Observable<Video | undefined> {
    return this.videos$.pipe(map((c) => c.insert(video)));
  }

  updateVideo(video: Video): Observable<Video | undefined> {
    return this.videos$.pipe(map((c) => c.update(video)));
  }

  databaseInit() {
    if (this.db.getCollection('videos') === null) {
      this.db.addCollection('videos');
    }
    this.videos$.next(this.db.getCollection('videos'));
  }
}
