import { TestBed } from '@angular/core/testing';
import { VideoService } from './video.service';
import { SignalRService } from './signalr.service';
import { AuthService } from './auth.service';

describe('VideoService', () => {
  let service: VideoService;
  let signalRSpy: jasmine.SpyObj<SignalRService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    signalRSpy = jasmine.createSpyObj('SignalRService', ['on', 'off', 'invoke', 'startConnection', 'isConnected'], {
      connectionState$: { pipe: () => ({ subscribe: () => {} }) },
    });
    authSpy = jasmine.createSpyObj('AuthService', ['getToken', 'getUserFromStorage']);
    authSpy.getToken.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        VideoService,
        { provide: SignalRService, useValue: signalRSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    });
    service = TestBed.inject(VideoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial call state not in call', () => {
    const state = service.callStateSnapshot;
    expect(state.isInCall).toBe(false);
    expect(state.participants).toEqual([]);
    expect(state.isVideoEnabled).toBe(true);
    expect(state.isAudioEnabled).toBe(true);
  });

  it('should expose callState$ observable', (done) => {
    service.callState$.subscribe((state) => {
      expect(state.isInCall).toBe(false);
      done();
    });
  });
});
