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

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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

    MatListModule,

    MatProgressSpinnerModule

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

  /** Show pre-join screen (room code + "Join Video Call" button) until user clicks join */
  showPreJoin = true;

  /** True while connecting and requesting camera/mic after user clicked join */
  joining = false;

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

 

  ngOnInit() {

    const code = this.route.snapshot.paramMap.get('code') || '';
    this.roomCode = this.normalizeRoomCode(code);
    if (!this.roomCode) {
      this.router.navigate(['/room']);
      return;
    }

    // Listen for room closed event

    this.signalR.on('RoomClosed', () => {

      this.snackBar.open('Room has been closed.', 'Close', { duration: 4000 });

      this.leaveCall();

      this.signalR.stopConnection();

      this.router.navigate(['/room']);

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

  /** Called when user clicks "Join Video Call" on the pre-join screen */
  async onJoinVideoCallClick(): Promise<void> {
    if (!this.roomCode || this.joining || this.isInCall) return;
    this.showPreJoin = false;
    this.joining = true;
    this.cdr.detectChanges();

    if (!this.signalR.isConnected()) {
      const token = this.auth.getToken();
      this.signalR.startConnection(environment.hubUrl, {
        accessTokenFactory: () => token || ''
      });
    }

    const connectionTimeoutMs = 15000;
    this.signalR.connectionState$.pipe(
      filter(connected => connected),
      take(1),
      timeout(connectionTimeoutMs),
      catchError(() => {
        this.joining = false;
        this.showPreJoin = true;
        this.cdr.detectChanges();
        this.snackBar.open('Could not connect to video service. Please check your connection and try again.', 'Close', { duration: 5000 });
        return of(false);
      })
    ).subscribe(async (connected) => {
      if (connected === false) return;
      await this.initializeVideo(this.roomCode);
      this.joining = false;
      this.cdr.detectChanges();
    });
  }

  /** Go back to room without joining */
  backToRoom(): void {
    this.router.navigate(['/room', this.roomCode]);
  }

  private async initializeVideo(roomCode: string): Promise<void> {
    try {
      const success = await this.videoService.initializeVideo(roomCode);
      if (!success) {
        this.snackBar.open(
          'Camera/microphone denied. Fix: 1) Click the lock or camera icon left of the URL. 2) Set Camera and Microphone to Allow. 3) Refresh the page and click Join again.',
          'Close',
          { duration: 12000 }
        );
        this.showPreJoin = true;
        this.joining = false;
        this.cdr.detectChanges();
      }
    } catch (err) {
      this.snackBar.open('Error initializing video: ' + String(err), 'Close', { duration: 7000 });
      this.showPreJoin = true;
      this.joining = false;
      this.cdr.detectChanges();
    }
  }

 

  private updateVideoElements() {

    const localParticipant = this.getLocalParticipant();

    if (localParticipant && this.localVideoRef?.nativeElement) {

      this.updateLocalVideo(localParticipant);

    }

 

    if (!this.remoteVideosContainer?.nativeElement) return;

 

    this.participants.forEach(participant => {

      if (participant.isLocal) return;

      this.updateRemoteVideo(participant);

    });

  }

 

  private updateLocalVideo(participant: VideoPeer) {

    const videoElement = this.localVideoRef?.nativeElement;

    if (!videoElement || !participant.stream) return;

    if (videoElement.srcObject === participant.stream) return;

    videoElement.srcObject = participant.stream;

    videoElement.muted = true;

    videoElement.play().catch(() => {});

  }

 

  private updateRemoteVideo(participant: VideoPeer) {

    const container = this.remoteVideosContainer?.nativeElement;

    if (!container || !participant.stream) return;

    const videoElement = container.querySelector(`video[data-id="${participant.id}"]`) as HTMLVideoElement | null;

    if (!videoElement) return;

    if (videoElement.srcObject === participant.stream) return;

    videoElement.srcObject = participant.stream;

    videoElement.muted = false;

    videoElement.play().catch(() => {});

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

      const message = err instanceof Error ? err.message : String(err);

      this.snackBar.open(message, 'Close', { duration: 4000 });

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

 

