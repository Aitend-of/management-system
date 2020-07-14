import {Component, OnInit, Input, Output, EventEmitter, Inject} from '@angular/core';
import * as moment from 'moment';

import {TimetableHttpService} from '../shared/timetable-http.service';
import {TimetableService} from '../timetable.service';
import {MatSidenav} from '@angular/material/sidenav';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import {Lesson} from '../../models/Lesson';
import {Group} from '../../models/Group';
import {User} from '../../models/User';
import {ISubject} from '../../models/Subject';
import {Room} from '../../models/Room';

@Component({
  selector: 'app-slider-menu',
  templateUrl: './slider-menu.component.html',
  styleUrls: ['./slider-menu.component.sass'],
})
export class SliderMenuComponent implements OnInit {
  @Input() hide: MatSidenav;
  @Input() lesson: Lesson;
  @Input() sliderAddNewState: boolean;
  @Output() deletedLesson = new EventEmitter();
  @Output() addLesson = new EventEmitter();

  private groupsUrl = 'api/groups';
  private roomsUrl = 'api/rooms';
  private subjectsUrl = 'api/subjects';
  private usersUrl = 'api/users';

  isChange = false;
  addNewForm: FormGroup;

  groups: Group[] = [];
  lecturers: User[] = [];
  subjects: ISubject[] = [];
  rooms: Room[] = [];
  constructor(
    private timetableHttpService: TimetableHttpService,
    private timetableService: TimetableService,
    public dialog: MatDialog,
  ) {}
  ngOnInit(): void {
    this.timetableHttpService.getData(this.groupsUrl).subscribe(groups => (this.groups = groups));
    this.timetableHttpService.getData(this.subjectsUrl).subscribe(subjects => (this.subjects = subjects));
    this.timetableHttpService.getData(this.roomsUrl).subscribe(rooms => (this.rooms = rooms));
    this.timetableHttpService
      .getData(this.usersUrl, '?role=lecturer')
      .subscribe(lecturers => (this.lecturers = lecturers));
    this.addNewForm = new FormGroup({
      subjectFormControl: new FormControl('', [Validators.required]),
      roomFormControl: new FormControl('', [Validators.required]),
      groupFormControl: new FormControl('', [Validators.required]),
      lecturerFormControl: new FormControl('', [Validators.required]),
      startDateFormControl: new FormControl('', [Validators.required]),
      endDateFormControl: new FormControl('', [Validators.required]),
      startTimeFormControl: new FormControl('', [Validators.required]),
      endTimeFormControl: new FormControl('', [Validators.required]),
    });
  }
  dateFilter(d: Date | null): boolean {
    const day = (d || new Date()).getDay();
    return day !== 0;
  }

  showRequiredErrorMessage(message: string): string {
    return `${message} is required`;
  }

  hasError(controlName: string, errorName: string) {
    return this.addNewForm.controls[controlName].hasError(errorName);
  }

  addNewLesson(LessonFormValue) {
    if (this.addNewForm.valid) {
      this.executeAddNewLesson(LessonFormValue);
    }
  }
  private executeAddNewLesson(lessonFormValue) {
    this.timetableService.changeProgressBarState(true);
    const newLesson: Lesson = {
      subject: lessonFormValue.subjectFormControl,
      room: lessonFormValue.roomFormControl,
      lecturer: lessonFormValue.lecturerFormControl,
      group: lessonFormValue.groupFormControl,
      startAt: moment(
        `${lessonFormValue.startDateFormControl.getFullYear()}-${
          lessonFormValue.startDateFormControl.getMonth() + 1
        }-${lessonFormValue.startDateFormControl.getDate()}T${lessonFormValue.startTimeFormControl}`,
        'YYYY-MM-DDTHH:mm',
      ),
      endAt: moment(
        `${lessonFormValue.endDateFormControl.getFullYear()}-${
          lessonFormValue.endDateFormControl.getMonth() + 1
        }-${lessonFormValue.endDateFormControl.getDate()}T${lessonFormValue.endTimeFormControl}`,
        'YYYY-MM-DDTHH:mm',
      ),
    } as Lesson;
    this.timetableHttpService.addLesson(newLesson).subscribe(
      lesson => {
        this.timetableService.changeProgressBarState(false);
        const dialogRef = this.dialog.open(SuccessDialogComponent, {
          height: '170px',
          width: '300px',
          disableClose: true,
          data: {},
        });
        dialogRef.afterClosed().subscribe();
        this.addLesson.emit(lesson);
        this.addNewForm.reset();
      },
      error => {
        // temporary as well
        this.timetableService.changeProgressBarState(false);
      },
    );
    this.hideComponent();
  }
  public onCancel() {
    this.hideComponent();
    this.addNewForm.reset();
  }
  updateLesson(
    subject: ISubject,
    room: Room,
    lecturer: User,
    group: Group,
    dateFrom: Date,
    dateTo: Date,
    timeFrom: string,
    timeTo: string,
  ) {
    this.timetableService.changeProgressBarState(true);
    if (subject && subject.id !== this.lesson.subject.id) {
      this.lesson.subject = subject;
      this.isChange = true;
    }
    if (room && room.id !== this.lesson.room.id) {
      this.lesson.room = room;
      this.isChange = true;
    }
    if (lecturer && lecturer.id !== this.lesson.lecturer.id) {
      this.lesson.lecturer = lecturer;
      this.isChange = true;
    }
    if (group && group.id !== this.lesson.group.id) {
      this.lesson.group = group;
      this.isChange = true;
    }
    if (dateFrom) {
      const date = moment(`${dateFrom.getFullYear()}-${dateFrom.getMonth() + 1}-${dateFrom.getDate()}`, 'YYYY-MM-DD');
      this.lesson.startAt.year(date.year()).month(date.month()).date(date.date());
      this.isChange = true;
    }
    if (dateTo) {
      const date = moment(`${dateTo.getFullYear()}-${dateTo.getMonth() + 1}-${dateTo.getDate()}`, 'YYYY-MM-DD');
      this.lesson.endAt.year(date.year()).month(date.month()).date(date.date());
      this.isChange = true;
    }
    if (timeFrom !== this.lesson.startAt.format('HH:mm')) {
      const time = moment(timeFrom, 'HH:mm');
      this.lesson.startAt.hour(time.hour()).minute(time.minute());
      this.isChange = true;
    }
    if (timeTo !== this.lesson.endAt.format('HH:mm')) {
      const time = moment(timeTo, 'HH:mm');
      this.lesson.endAt.hour(time.hour()).minute(time.minute());
      this.isChange = true;
    }
    if (this.isChange) {
      this.timetableHttpService.updateLesson(this.lesson).subscribe(() => {
        this.timetableService.changeProgressBarState(false);
        this.hideComponent();
        this.isChange = false;
      });
    } else {
      this.timetableService.changeProgressBarState(false);
    }
  }

  deleteLesson() {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '250px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeDeleteLesson();
      }
    });
  }
  private executeDeleteLesson() {
    this.timetableService.changeProgressBarState(true);
    this.deletedLesson.emit(this.lesson);
    this.timetableHttpService.deleteLesson(this.lesson.id).subscribe(() => {
      this.timetableService.changeProgressBarState(false);
      this.hideComponent();
    });
  }
  hideComponent(): void {
    this.addNewForm.reset();
    this.sliderAddNewState = false;
    this.timetableService.changeAddLessonComponentState(this.sliderAddNewState);
    this.hide.close();
  }
}

@Component({
  selector: 'app-delete-dialog',
  templateUrl: 'delete-dialog.html',
})
export class DeleteDialogComponent {
  constructor(public dialogRef: MatDialogRef<DeleteDialogComponent>, @Inject(MAT_DIALOG_DATA) public data) {}
  isDelete = false;
  onNoClick(): void {
    this.dialogRef.close();
  }
}
@Component({
  selector: 'app-success-dialog',
  templateUrl: 'success-dialog.html',
})
export class SuccessDialogComponent {
  constructor(public dialogRef: MatDialogRef<SuccessDialogComponent>, @Inject(MAT_DIALOG_DATA) public data) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
