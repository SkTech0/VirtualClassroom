import { TestBed } from '@angular/core/testing';
import { VideoService } from './video.service';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

describe('VideoService', () => {
  let service: VideoService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['post', 'get']);
    authSpy = jasmine.createSpyObj('AuthService', ['getToken', 'getUserFromStorage']);
    authSpy.getToken.and.returnValue(null);
    authSpy.getUserFromStorage.and.returnValue({ username: 'Test', email: 'test@test.com' });

    TestBed.configureTestingModule({
      providers: [
        VideoService,
        { provide: ApiService, useValue: apiSpy },
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
