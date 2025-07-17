import { Injectable } from '@nestjs/common';
import { Video } from './video.model';
import * as Loki from 'lokijs';
import { map, Observable, ReplaySubject, take, tap } from 'rxjs';

@Injectable()
export class DataService {
  videosCollection$: ReplaySubject<Collection<Video>> = new ReplaySubject();
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

  videos(): Observable<Video[]> {
    return this.videosCollection$.asObservable().pipe(map(collection => collection.find()));
  }

  findVideo(options: { fileName?: string, uuid?: string }): Observable<Video | null> {

    return this.videosCollection$.pipe(
      take(1),
      map((c) => c.findOne(options)),
    );
  }

  insertVideo(video: Video): Observable<Video | undefined> {
    return this.videosCollection$.pipe(map((c) => c.insert(video)));
  }

  updateVideo(video: Video): Observable<Video | undefined> {
    return this.videosCollection$.pipe(map((c) => c.update(video)));
  }

  databaseInit() {
    if (this.db.getCollection('videos') === null) {
      this.db.addCollection('videos');
    }
    this.videosCollection$.next(this.db.getCollection('videos'));
  }
}
