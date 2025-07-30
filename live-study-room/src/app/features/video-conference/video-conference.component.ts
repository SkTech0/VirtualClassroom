import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

@Component({
  selector: 'app-video-conference',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatToolbarModule
  ],
  templateUrl: './video-conference.component.html',
  styleUrls: ['./video-conference.component.css']
})
export class VideoConferenceComponent implements OnInit, OnDestroy, AfterViewInit {
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

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService,
    private snackBar: MatSnackBar
  ) {
    this.callState$ = this.videoService.callState$;
  }

  async ngOnInit() {
    this.roomCode = this.route.snapshot.paramMap.get('code') || '';
    this.callState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.participants = state.participants;
      this.isVideoEnabled = state.isVideoEnabled;
      this.isAudioEnabled = state.isAudioEnabled;
      this.isScreenSharing = state.isScreenSharing;
      this.isInCall = state.isInCall;
      this.updateVideoElements();
    });

    await this.initializeVideo(this.roomCode);
  }

  ngAfterViewInit() {
    this.updateVideoElements();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.videoService.leaveCall();
  }

  private async initializeVideo(roomCode: string) {
    try {
      const success = await this.videoService.initializeVideo();
      if (!success) {
        this.snackBar.open('Failed to access camera/microphone.', 'Close', { duration: 7000 });
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
    setTimeout(() => {
      this.participants.forEach(participant => {
        if (participant.isLocal) {
          this.updateLocalVideo(participant);
        } else {
          this.updateRemoteVideo(participant);
        }
      });
    }, 100);
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

  leaveCall() {
    this.videoService.leaveCall();
    this.snackBar.open('Left the call.', 'Close', { duration: 2000 });
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
    navigator.clipboard.writeText(this.roomCode);
    this.snackBar.open('Room code copied!', 'Close', { duration: 2000 });
  }
}
