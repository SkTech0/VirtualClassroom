import {

  Component,

  OnInit,

  OnDestroy,

  ViewChild,

  ElementRef,

  AfterViewInit,

  ChangeDetectorRef,

  AfterViewChecked

} from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatCardModule } from '@angular/material/card';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatSnackBar } from '@angular/material/snack-bar';

import { Subject, Observable } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

import { VideoService, VideoPeer, VideoCallState } from '../../core/services/video.service';

import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/services/auth.service';

import { SignalRService } from '../../core/services/signalr.service';

import { filter, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { MatSidenavModule } from '@angular/material/sidenav';

import { MatListModule } from '@angular/material/list';
import { environment } from '../../../environments/environment';



@Component({

  selector: 'app-video-conference',

  standalone: true,

  imports: [

    CommonModule,

    MatButtonModule,

    MatIconModule,

    MatCardModule,

    MatTooltipModule,

    MatToolbarModule,

    MatSidenavModule,

    MatListModule

  ],

  templateUrl: './video-conference.component.html',

  styleUrls: ['./video-conference.component.css']

})

export class VideoConferenceComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {

  @ViewChild('localVideo', { static: false }) localVideoRef!: ElementRef<HTMLVideoElement>;

  @ViewChild('remoteVideosContainer', { static: false }) remoteVideosContainer!: ElementRef<HTMLDivElement>;

 

  callState$: Observable<VideoCallState>;

  participants: VideoPeer[] = [];

  isVideoEnabled = true;

  isAudioEnabled = true;

  isScreenSharing = false;

  isInCall = false;

  roomCode = '';

 

  private destroy$ = new Subject<void>();

  private videoElements = new Map<string, HTMLVideoElement>();

  private lastParticipantCount = 0;

 

  constructor(

    private route: ActivatedRoute,

    private videoService: VideoService,

    private snackBar: MatSnackBar,

    private cdr: ChangeDetectorRef,

    private signalR: SignalRService,

    private auth: AuthService,

    private router: Router

  ) {

    this.callState$ = this.videoService.callState$;

  }

 

  async ngOnInit() {

    const code = this.route.snapshot.paramMap.get('code') || '';
    this.roomCode = this.normalizeRoomCode(code);

    // Start SignalR connection if not connected

    if (!this.signalR.isConnected()) {

      const token = this.auth.getToken();

      await this.signalR.startConnection(environment.hubUrl, {

        accessTokenFactory: () => token || ''

      });

    }

    // Listen for room closed event

    this.signalR.on('RoomClosed', () => {

      this.snackBar.open('Room has been closed.', 'Close', { duration: 4000 });

      this.leaveCall();

      this.signalR.stopConnection();

      this.router.navigate(['/room']);

    });

    // Wait for connection (with 15s timeout), then initialize video

    const connectionTimeoutMs = 15000;

    this.signalR.connectionState$.pipe(

      filter(connected => connected),

      take(1),

      timeout(connectionTimeoutMs),

      catchError(() => {

        this.snackBar.open('Could not connect to video service. Please check your connection and try again.', 'Close', { duration: 5000 });

        this.router.navigate(['/room', this.roomCode]);

        return of(false);

      })

    ).subscribe(connected => {

      if (connected !== false) {

        this.initializeVideo(this.roomCode);

      }

    });

    // Subscribe to call state changes

    this.callState$.pipe(takeUntil(this.destroy$)).subscribe(state => {

      this.participants = state.participants;

      this.isVideoEnabled = state.isVideoEnabled;

      this.isAudioEnabled = state.isAudioEnabled;

      this.isScreenSharing = state.isScreenSharing;

      this.isInCall = state.isInCall;

      // Trigger change detection when participants change

      if (this.participants.length !== this.lastParticipantCount) {

        this.lastParticipantCount = this.participants.length;

        this.cdr.detectChanges();

      }

    });

  }

 

  ngAfterViewInit() {

    this.updateVideoElements();

  }

 

  ngAfterViewChecked() {

    // Update video elements when view is checked

    this.updateVideoElements();

  }

 

  ngOnDestroy() {

    this.destroy$.next();

    this.destroy$.complete();

   

    // Clean up video elements

    this.videoElements.forEach(element => {

      if (element.parentNode) {

        element.parentNode.removeChild(element);

      }

    });

    this.videoElements.clear();

   

    // Leave call

    this.videoService.leaveCall();

  }

 

  private normalizeRoomCode(code: string): string {
    return (code || '').trim().toUpperCase();
  }

  private async initializeVideo(roomCode: string) {

    try {

      const success = await this.videoService.initializeVideo(roomCode);

      if (!success) {

        this.snackBar.open('Failed to access camera/microphone. Please check permissions.', 'Close', { duration: 7000 });

        console.error('getUserMedia failed for this participant.');

      } else {

        console.log('Media initialized and joined room.');

      }

    } catch (err) {

      this.snackBar.open('Error initializing video: ' + String(err), 'Close', { duration: 7000 });

      console.error('Error in initializeVideo:', err);

    }

  }

 

  private updateVideoElements() {

    if (!this.remoteVideosContainer?.nativeElement) return;

 

    const currentIds = new Set(this.participants.map(p => p.id));

   

    // Remove stale video elements

    this.videoElements.forEach((element, id) => {

      if (!currentIds.has(id)) {

        if (element.parentNode) {

          element.parentNode.removeChild(element);

        }

        this.videoElements.delete(id);

      }

    });

 

    // Update existing and add new video elements

    this.participants.forEach(participant => {

      if (participant.isLocal) {

        this.updateLocalVideo(participant);

      } else {

        this.updateRemoteVideo(participant);

      }

    });

  }

 

  private updateLocalVideo(participant: VideoPeer) {

    const videoElement = this.localVideoRef?.nativeElement;

    if (videoElement && participant.stream) {

      videoElement.srcObject = participant.stream;

      videoElement.muted = true;

      videoElement.play().catch(err => console.error('Play local video error:', err));

    }

  }

 

  private updateRemoteVideo(participant: VideoPeer) {

    let videoElement = this.videoElements.get(participant.id);

 

    if (!videoElement) {

      videoElement = document.createElement('video');

      videoElement.autoplay = true;

      videoElement.playsInline = true;

      videoElement.className = 'remote-video';

 

      if (this.remoteVideosContainer?.nativeElement) {

        this.remoteVideosContainer.nativeElement.appendChild(videoElement);

      }

 

      this.videoElements.set(participant.id, videoElement);

    }

 

    if (participant.stream) {

      videoElement.srcObject = participant.stream;

      videoElement.play().catch(err => console.error('Play remote video error:', err));

    }

  }

 

  toggleVideo() {

    try {

      this.videoService.toggleVideo();

      const newState = this.videoService.callStateSnapshot.isVideoEnabled;

      this.snackBar.open(newState ? 'Video enabled' : 'Video disabled', 'Close', { duration: 2000 });

    } catch (err) {

      this.snackBar.open('Error toggling video: ' + String(err), 'Close', { duration: 4000 });

    }

  }

 

  toggleAudio() {

    try {

      this.videoService.toggleAudio();

      const newState = this.videoService.callStateSnapshot.isAudioEnabled;

      this.snackBar.open(newState ? 'Audio enabled' : 'Audio muted', 'Close', { duration: 2000 });

    } catch (err) {

      this.snackBar.open('Error toggling audio: ' + String(err), 'Close', { duration: 4000 });

    }

  }

 

  async toggleScreenShare() {

    try {

      const newState = await this.videoService.toggleScreenShare();

      this.snackBar.open(

        newState ? 'Screen sharing started' : 'Screen sharing stopped',

        'Close',

        { duration: 2000 }

      );

    } catch (err) {

      this.snackBar.open('Error toggling screen share: ' + String(err), 'Close', { duration: 4000 });

    }

  }

 

  async leaveCall() {

    try {

      await this.videoService.leaveCall();

      this.snackBar.open('Left the call.', 'Close', { duration: 2000 });

    } catch (err) {

      this.snackBar.open('Error leaving call: ' + String(err), 'Close', { duration: 4000 });

    }

  }

 

  getParticipantCount(): number {

    return this.participants.length;

  }

 

  getLocalParticipant(): VideoPeer | undefined {

    return this.participants.find(p => p.isLocal);

  }

 

  getRemoteParticipants(): VideoPeer[] {

    return this.participants.filter(p => !p.isLocal);

  }

 

  copyRoomCode() {

    try {

      navigator.clipboard.writeText(this.roomCode);

      this.snackBar.open('Room code copied!', 'Close', { duration: 2000 });

    } catch (err) {

      console.error('Failed to copy room code:', err);

      this.snackBar.open('Failed to copy room code', 'Close', { duration: 2000 });

    }

  }

}

 

